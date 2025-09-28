# app.py — CrewAI-style pipeline with RAG (FAISS) + Gemini (via OpenAI-compatible client)
import os
import json
import re
import logging
import traceback
from typing import List, Dict, Any
import time # Import time module

import re
from typing import Any, Dict

from crewai_tools import SerperDevTool
from crewai_tools import ScrapeWebsiteTool
from crewai_tools import GithubSearchTool
from crewai_tools import WebsiteSearchTool

from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
from openai import OpenAI  # OpenAI client pointed to Gemini endpoint (user had this approach)
from dotenv import load_dotenv # Import load_dotenv

# Load environment variables from .env file
load_dotenv()


import google.generativeai as genai
app = FastAPI()

# Fetch Gemini API Key from .env
API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
    raise RuntimeError("❌ GENIE_API_KEY2 not found in environment variables")

genai.configure(api_key=API_KEY)
# -----------------------
# CONFIG / logging
# -----------------------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("crewai-rag")

VULN_INDEX_PATH = "vuln_index_updated.faiss"
VULN_META_PATH = "all_vulnerabilities_updated.json"
EMBED_MODEL_NAME = "all-MiniLM-L6-v2"
RETRIEVE_K = 6
GENIE_MODEL = os.getenv("GENIE_MODEL", "gemini-2.5-flash")  # model name exposed by user's key/project

MAX_PROMPT_CHUNKS = 5

# Prefer environment variable — fallback to env var name user used previously (if present)
API_KEY = os.getenv("GENIE_API_KEY") or os.getenv("OPENAI_API_KEY")
if not API_KEY:
    # For safety: do not hardcode keys here. The user must set the env var.
    raise RuntimeError("Set GENIE_API_KEY or OPENAI_API_KEY environment variable with your Gemini/OpenAI key.")

# === OpenAI / Gemini client (pointed at Google "openai" compatibility endpoint) ===
# Note: the base_url used earlier by the user
client = OpenAI(
    api_key=API_KEY,
    base_url=os.getenv("GENIE_BASE_URL", "https://generativelanguage.googleapis.com/v1beta/openai/")
)

# -----------------------
# Load resources
# -----------------------
logger.info("Loading embedding model and FAISS index...")
embedder = SentenceTransformer(EMBED_MODEL_NAME)

if not os.path.exists(VULN_INDEX_PATH) or not os.path.exists(VULN_META_PATH):
    raise FileNotFoundError("vuln_index.faiss or all_vulnerabilities.json not found. Run build_index.py first.")

index = faiss.read_index(VULN_INDEX_PATH)
with open(VULN_META_PATH, "r", encoding="utf-8") as f:
    meta = json.load(f)

# -----------------------
# Helpers
# -----------------------
def embed_texts(texts: List[str]) -> np.ndarray:
    emb = embedder.encode(texts, convert_to_numpy=True)
    if emb.dtype != np.float32:
        emb = emb.astype("float32")
    return emb

def retrieve_similar(query: str, k: int = RETRIEVE_K) -> List[Dict[str, Any]]:
    q_emb = embed_texts([query])
    D, I = index.search(q_emb, k)
    results = []
    for score, idx in zip(D[0], I[0]):
        if idx < 0 or idx >= len(meta):
            continue
        entry = meta[idx].copy()
        entry["_score"] = float(score)
        results.append(entry)
    return results

def extract_text_from_response(response: Any) -> str:
    """
    Robust extraction of the textual content from varied response shapes returned by
    different OpenAI / Gemini-compatible clients.
    """
    try:
        # 1) If response has to_dict(), inspect it
        if hasattr(response, "to_dict"):
            resp_d = response.to_dict()
        else:
            # try direct dict-like
            resp_d = json.loads(json.dumps(response, default=lambda o: getattr(o, "_dict_", str(o))))
    except Exception:
        resp_d = None

    text_candidates = []

    # Look for common shapes:
    try:
        if resp_d:
            # If choices exist
            choices = resp_d.get("choices") or resp_d.get("output") or resp_d.get("outputs")
            if isinstance(choices, list) and len(choices) > 0:
                c0 = choices[0]
                # Many variants: c0.get('message') or c0.get('content') or c0.get('text') or c0.get('output_text')
                if isinstance(c0, dict):
                    # nested message -> content
                    if "message" in c0:
                        msg = c0["message"]
                        if isinstance(msg, dict):
                            # Chat message with content field
                            content = msg.get("content")
                            if isinstance(content, str):
                                text_candidates.append(content)
                            elif isinstance(content, list):
                                # join content pieces
                                for p in content:
                                    if isinstance(p, dict):
                                        text_candidates.append(p.get("text") or p.get("content") or "")
                                    elif isinstance(p, str):
                                        text_candidates.append(p)
                        elif isinstance(msg, str):
                            text_candidates.append(msg)
                    # other fallback keys
                    if "text" in c0 and isinstance(c0["text"], str):
                        text_candidates.append(c0["text"])
                    if "output_text" in c0 and isinstance(c0["output_text"], str):
                        text_candidates.append(c0["output_text"])
                    if "content" in c0:
                        # sometimes content is list/dict/str
                        content = c0["content"]
                        if isinstance(content, str):
                            text_candidates.append(content)
                        elif isinstance(content, list):
                            for p in content:
                                if isinstance(p, dict):
                                    text_candidates.append(p.get("text") or p.get("content") or "")
                                elif isinstance(p, str):
                                    text_candidates.append(p)
                else:
                    # c0 is not dict: str maybe
                    if isinstance(c0, str):
                        text_candidates.append(c0)
            # Also try top-level 'output_text' or 'text'
            if "output_text" in resp_d and isinstance(resp_d["output_text"], str):
                text_candidates.append(resp_d["output_text"])
            if "text" in resp_d and isinstance(resp_d["text"], str):
                text_candidates.append(resp_d["text"])
    except Exception:
        logger.debug("extract_text_from_response: complex parsing failed", exc_info=True)

    # As fallback, try dot access on original response object (some OpenAI objects)
    try:
        if not text_candidates:
            choices = getattr(response, "choices", None)
            if choices and len(choices) > 0:
                # choice.message might be an object
                choice0 = choices[0]
                msg = getattr(choice0, "message", None)
                # try message.content
                if msg is not None:
                    content = getattr(msg, "content", None)
                    if isinstance(content, str):
                        text_candidates.append(content)
                    elif isinstance(content, list):
                        for part in content:
                            if isinstance(part, dict):
                                text_candidates.append(part.get("text") or part.get("content") or "")
                            elif isinstance(part, str):
                                text_candidates.append(part)
                # fallback: choice0.text
                textattr = getattr(choice0, "text", None)
                if isinstance(textattr, str) and textattr:
                    text_candidates.append(textattr)
    except Exception:
        pass

    # final fallback: string representation
    if not text_candidates:
        try:
            s = str(response)
            text_candidates.append(s)
        except Exception:
            text_candidates.append("")

    # join and return best candidate (prefer first non-empty)
    for c in text_candidates:
        if isinstance(c, str) and c.strip():
            return c.strip()
    # else return concatenation
    return "\n".join([c for c in text_candidates if isinstance(c, str)])

# -----------------------
# Agents
# -----------------------
class ParserAgent:
    """Extract functions and important context from solidity code (simple heuristic)."""
    @staticmethod
    def extract_functions(sol_text: str) -> List[Dict[str,Any]]:
        lines = sol_text.splitlines()
        results = []
        for i, line in enumerate(lines):
            # skip commented-out 'function' occurrences inside block comments? Keep simple: look for 'function ' token
            if "function " in line and not line.strip().startswith("//"):
                start = max(0, i-3)
                end = min(len(lines), i+12)
                snippet = "\n".join(lines[start:end])
                results.append({"line": i+1, "snippet": snippet})
        if not results:
            results.append({"line": 1, "snippet": "\n".join(lines[:40])})
        return results

class RetrieverAgent:
    """Query FAISS and return ranked KB entries."""
    @staticmethod
    def get_relevant_context(snippet: str, k: int = RETRIEVE_K):
        hits = retrieve_similar(snippet, k=k)
        for h in hits:
            h["_sim"] = 1.0 / (1.0 + h["_score"])
        hits.sort(key=lambda x: x["_sim"], reverse=True)
        return hits

class AnalyzerAgent:
    """Combine parser + retriever to produce a finding candidate list."""
    @staticmethod
    def analyze_contract(sol_text: str) -> List[Dict[str,Any]]:
        functions = ParserAgent.extract_functions(sol_text)
        findings = []
        for f in functions:
            context_hits = RetrieverAgent.get_relevant_context(f["snippet"], k=RETRIEVE_K)
            findings.append({
                "function_line": f["line"],
                "snippet": f["snippet"],
                "context_hits": context_hits
            })
        return findings

class FixerAgent:
    """Use Gemini (via OpenAI client) + RAG context to produce explanation + suggested patch."""
    @staticmethod
    def generate_fix(snippet: str, context_docs: List[Dict[str,Any]]) -> Dict[str,Any]:
        # Build retrieval block (short)
        docs_texts = []
        for d in context_docs[:MAX_PROMPT_CHUNKS]:
            short = d.get("description") or d.get("explanation") or ""
            rem = d.get("remediation") or d.get("fix") or d.get("fixes") or ""
            docs_texts.append(f"[{d.get('swc_id', d.get('id',''))}] {d.get('title','')}\nSHORT: {short}\nFIX: {rem}\n")
        retrieval_block = "\n---\n".join(docs_texts)

        system_prompt = (
            "You are a Solidity security expert. Use ONLY the retrieved canonical docs below and the code snippet to:\n"
            "1) Identify the most likely vulnerability type (map to an SWC ID if possible).\n"
            "2) Produce a concise 1-2 line explanation of the bug.\n"
            "3) Provide a minimal code-level fix (a code snippet or unified-diff) with short justification.\n"
            "4) Provide a confidence level (high/medium/low) and reasons.\n\n"
            "Return JSON only with keys: swc_id, title, explanation, fix, confidence, notes.\n"
        )

        user_prompt = f"CODE SNIPPET (for context):\n{snippet}\n\nRETRIEVED KNOWLEDGE:\n{retrieval_block}\n\nProduce the answer now in JSON."

        try:
            # chat.completions.create is what the user used earlier (OpenAI client pointed at Gemini compatibility)
            response = client.chat.completions.create(
                model=GENIE_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.0,
                max_tokens=600
            )
            text = extract_text_from_response(response)
            logger.debug("LLM raw text: %s", text[:1000])
        except Exception as e:
            logger.exception("LLM call failed")
            return {"error": str(e)}

        # Try to extract JSON payload from LLM
        jmatch = re.search(r"\{[\s\S]*\}", text)
        if jmatch:
            candidate = jmatch.group(0)
            try:
                parsed = json.loads(candidate)
                return parsed
            except Exception:
                # if it's invalid JSON, return raw for further processing
                return {"raw": text}
        else:
            # Not JSON shaped; return raw text
            return {"raw": text}



import re
from typing import Dict, Any

import re
from typing import Any, Dict

# Optional: also fallback to built-in web if you want
# from tools import web  




import asyncio

class SuggestionAgent:
    """
    Suggests natural language explanation + patched code snippet for Solidity vulnerabilities.
    Combines:
      - SWC templates (curated knowledge base)
      - Heuristic patching (fallback)
      - External search + scraping for enriched explanations
    Guarantees:
      - Always returns usable natural-language explanations
      - Always returns usable patched_code
    """

    # Free external tools
    search_tool = SerperDevTool(API_KEY = os.getenv("GENIE_API_KEY2"))        # Google-like search
    scrape_tool = ScrapeWebsiteTool()       # Web scraping
  

    SWC_TEMPLATES = {
        "SWC-107": {
            "title": "Reentrancy",
            "severity": "High",
            "nl": "External call before state update enables reentrancy. Use Checks-Effects-Interactions and a reentrancy guard.",
            "patch": (
                "import \"@openzeppelin/contracts/security/ReentrancyGuard.sol\";\n\n"
                "contract Safe is ReentrancyGuard {\n"
                "    mapping(address => uint256) public balances;\n\n"
                "    function withdraw(uint256 amount) external nonReentrant {\n"
                "        require(balances[msg.sender] >= amount, \"Insufficient funds\");\n"
                "        balances[msg.sender] -= amount;\n"
                "        (bool ok, ) = msg.sender.call{value: amount}(\"\");\n"
                "        require(ok, \"transfer failed\");\n"
                "    }\n"
                "}\n"
            )
        },
        "SWC-115": {
            "title": "Authorization via tx.origin",
            "severity": "High",
            "nl": "Do not use tx.origin for authorization — replace with msg.sender or onlyOwner.",
            "patch": "require(msg.sender == owner, \"not owner\");"
        },
        "SWC-106": {
            "title": "Unprotected SELFDESTRUCT",
            "severity": "High",
            "nl": "Unprotected selfdestruct lets anyone kill the contract. Restrict with onlyOwner.",
            "patch": (
                "import \"@openzeppelin/contracts/access/Ownable.sol\";\n"
                "contract Safe is Ownable {\n"
                "    function destroy(address payable to) external onlyOwner {\n"
                "        selfdestruct(to);\n"
                "    }\n"
                "}\n"
            )
        },
    }

    @staticmethod
    async def suggest_fix(snippet: str, analysis: dict) -> dict:
        swc = analysis.get("swc_id")
        title = analysis.get("title")
        explanation = analysis.get("explanation")
        fix_text = analysis.get("fix") or analysis.get("patch")
        confidence = analysis.get("confidence", "")

        nl_lines = []
        patched_code = None

        # --- Case 1: Known SWC template ---
        if swc and swc in SuggestionAgent.SWC_TEMPLATES:
            t = SuggestionAgent.SWC_TEMPLATES[swc]
            nl_lines.append(f"⚠ Vulnerability: {t['title']} ({swc})")
            nl_lines.append(f"Why: {t['nl']}")
            if confidence:
                nl_lines.append(f"Confidence: {confidence}")
            nl_lines.append("Suggested fix is provided below.")
            patched_code = (
                fix_text.strip() if fix_text and any(tok in fix_text for tok in ("function","contract","pragma","require"))
                else t["patch"]
            )

        # --- Case 2: Analysis has info but no SWC template ---
        elif title or explanation or (fix_text and isinstance(fix_text, str)):
            nl_lines.append(f"⚠ Vulnerability: {title or 'Unclassified'}")
            if explanation:
                nl_lines.append(f"Why: {explanation}")
            else:
                enriched = await SuggestionAgent.external_explanation(snippet)
                nl_lines.append(f"Why: {enriched}")
            if confidence:
                nl_lines.append(f"Confidence: {confidence}")
            nl_lines.append("Suggested fix is provided below.")
            patched_code = (
                fix_text.strip() if fix_text and any(tok in fix_text for tok in ("function","contract","pragma","require"))
                else SuggestionAgent.heuristic_patch(snippet)
            )

        # --- Case 3: Nothing → external tools + heuristic ---
        else:
            enriched = await SuggestionAgent.external_explanation(snippet)
            nl_lines.append(f"⚠ Vulnerability: Potential issue detected")
            nl_lines.append(f"Why: {enriched}")
            nl_lines.append("Suggested fix is provided below.")
            patched_code = SuggestionAgent.heuristic_patch(snippet)

        return {
            "raw": snippet.strip(),
            "patched_code": patched_code,
            "natural_language": "\n".join(nl_lines)
        }

    @staticmethod
    async def external_explanation(snippet: str) -> str:
        """Try multiple external tools to generate a concise natural language explanation."""
        query = f"Solidity vulnerability pattern: {snippet[:60]}"

        # 1️⃣ SerperDev search
        try:
            result = SuggestionAgent.search_tool.run(query)
            if result:
                return result[:300]
        except Exception:
            pass

        # 2️⃣ Website scraping (SWC reference)
        try:
            result = SuggestionAgent.scrape_tool.run(f"https://swcref.org/search?q={snippet[:50]}")
            if result:
                return result[:300]
        except Exception:
            pass

        # try:
        #     loop = asyncio.get_event_loop()
        #     model = SuggestionAgent.gemini_client.models
        #     response = await loop.run_in_executor(
        #         None,
        #         lambda: model.generate_content(
        #             model="gemini-2.5-pro",
        #             contents=f"""
        #             Explain the vulnerability in this Solidity code snippet in clear natural language.
        #             Also suggest recommended fixes.
        #             Code snippet:
        #             {snippet}
        #             """
        #         )
        #     )
        #     if hasattr(response, "text") and response.text:
        #         return response.text[:500]
        # except Exception:
        #     pass

        # 3️⃣ GitHub code search
        # try:
        #     result = SuggestionAgent.github_tool.run(query)
        #     if result:
        #         return result[:300]
        # except Exception:
        #     pass

        # # 4️⃣ Website search
        # try:
        #     result = SuggestionAgent.website_search_tool.run(query)
        #     if result:
        #         return result[:300]
        # except Exception:
        #     pass

        # 5️⃣ Fallback heuristic explanation
        return (
            "Potential vulnerability detected. Review for unsafe patterns like reentrancy, "
            "delegatecall misuse, selfdestruct, or access control issues."
        )

    @staticmethod
    def heuristic_patch(snippet: str) -> str:
        s = snippet.lower()
        if "call{value" in s or "call.value" in s:
            return (
                "// Heuristic fix: apply Checks-Effects-Interactions\n"
                "balances[msg.sender] -= amount;\n"
                "(bool ok, ) = msg.sender.call{value: amount}(\"\");\n"
                "require(ok, \"transfer failed\");\n"
            )
        if "tx.origin" in s:
            return snippet.replace("tx.origin", "msg.sender")
        if "selfdestruct" in s:
            return (
                "// Heuristic fix: restrict selfdestruct\n"
                "modifier onlyOwner() { require(msg.sender == owner, \"only owner\"); _; }\n"
                "function destroy(address payable to) external onlyOwner { selfdestruct(to); }\n"
            )
        if "delegatecall" in s:
            return (
                "// Heuristic fix: restrict delegatecall\n"
                "require(isTrusted(callee), \"untrusted callee\");\n"
                "(bool ok, ) = callee.delegatecall(data);\n"
                "require(ok, \"delegatecall failed\");\n"
            )
        if re.search(r"function\s+\w+\s*\(", snippet) and all(v not in snippet for v in ("external","public","internal","private")):
            return snippet.replace("{", " external {", 1)
        return "// No automatic patch available — please review manually.\n" + snippet


class RiskClassifierAgent:
    """Map LLM/KB guidance to a severity bucket."""
    SWC_SEVERITY = {
        "SWC-107": "High",  # Reentrancy
        "SWC-110": "High",
        "SWC-104": "High",
        "SWC-125": "High",
        "SWC-115": "High",  # tx.origin
        "SWC-106": "High",  # selfdestruct
        "SWC-112": "High",  # delegatecall
        "SWC-105": "High",  # unprotected ether withdrawal
        "SWC-113": "Medium",
        "SWC-100": "Medium",
        "SWC-108": "Medium",
        "SWC-134": "Low",
        # add more mappings if desired
    }

    @staticmethod
    def classify(confidence: str, swc_hint: str=None) -> str:
        if swc_hint:
            mapped = RiskClassifierAgent.SWC_SEVERITY.get(swc_hint)
            if mapped:
                return mapped
        if confidence:
            c = confidence.lower()
            if c.startswith("high"):
                return "High"
            if c.startswith("medium"):
                return "Medium"
        return "Low"

# -----------------------
# FastAPI
# -----------------------
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
import io
import datetime
import matplotlib
matplotlib.use("Agg")  # headless backend
import matplotlib.pyplot as plt

from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Image as RLImage,
    Table,
    TableStyle,
    PageBreak,
    Preformatted,
)
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.utils import ImageReader

import json
from typing import Dict, Any



from fastapi.middleware.cors import CORSMiddleware
app = FastAPI(title="CrewAI-RAG Solidity Analyzer (Improved)")
origins = [
    "*",
  
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalysisResult(BaseModel):
    issues: List[Dict[str, Any]]
    summary: Dict[str, int]

@app.post("/analyze", response_model=AnalysisResult)
async def analyze_contract(file: UploadFile = File(...)):
    if not file.filename.endswith(".sol"):
        raise HTTPException(status_code=400, detail="Upload a .sol file")
    content = (await file.read()).decode("utf-8", errors="ignore")

    findings = AnalyzerAgent.analyze_contract(content)

    issues = []
    counts = {"High": 0, "Medium": 0, "Low": 0}

    for f in findings:
        context_hits = f["context_hits"]
        # provide the top KB hits as context docs for LLM
        fixer_result = FixerAgent.generate_fix(f["snippet"], context_hits)

        # If LLM returned structured result with swc_id/confidence
        swc = None
        conf = "low"
        if isinstance(fixer_result, dict):
            swc = fixer_result.get("swc_id")
            conf = fixer_result.get("confidence", conf)

        # If LLM didn't return swc but KB hits exist, use top KB hit as hint
        if not swc and context_hits and len(context_hits) > 0:
            top_hit = context_hits[0]
            swc_hint = top_hit.get("swc_id")
            if swc_hint:
                swc = swc_hint

        severity = RiskClassifierAgent.classify(conf, swc)
        counts[severity] += 1

        # NEW: create human-friendly suggestions and patched code
        suggestion = await SuggestionAgent.suggest_fix(f["snippet"], fixer_result if isinstance(fixer_result, dict) else {"raw": fixer_result})

        issue = {
            "function_line": f["function_line"],
            "snippet": f["snippet"],
            "kb_hits": [{"swc_id": h.get("swc_id"), "title": h.get("title"), "source": h.get("source")} for h in context_hits[:3]],
            "analysis": fixer_result,
            "severity": severity,
            "suggestion": suggestion
        }
        issues.append(issue)

    summary = {"High": counts["High"], "Medium": counts["Medium"], "Low": counts["Low"], "total": len(issues)}
    return {"issues": issues, "summary": summary}
# app/main.py
# app.py  (replace your existing file contents or the generate_pdf_bytes + helpers)

# ---------- helper: create matplotlib charts and return ReportLab Image flowable ----------
def fig_to_rl_image(fig, max_width_pts: float = None, max_height_pts: float = None):
    """
    Save matplotlib fig to a bytes buffer and return a reportlab Image scaled to fit
    max_width_pts or max_height_pts while preserving aspect ratio.
    max_width_pts / max_height_pts are in reportlab points (1 inch = 72 pts).
    """
    buf = io.BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight", dpi=150)
    plt.close(fig)
    buf.seek(0)

    # use ImageReader to get image's native size (pixels)
    reader = ImageReader(buf)
    iw, ih = reader.getSize()  # pixels (ratio matters)

    if max_width_pts:
        width_pts = max_width_pts
        height_pts = width_pts * (ih / iw)
    elif max_height_pts:
        height_pts = max_height_pts
        width_pts = height_pts * (iw / ih)
    else:
        # fallback: use a reasonable default width
        width_pts = 5 * inch
        height_pts = width_pts * (ih / iw)

    return RLImage(buf, width=width_pts, height=height_pts)


def create_donut_chart(counts: Dict[str, int], max_width_pts: float):
    # professional muted color palette
    severity_colors = {
        "high": "#C0392B",    # dark red
        "medium": "#E67E22",  # amber
        "low": "#3498DB",     # blue
    }
    labels = []
    sizes = []
    colors_list = []
    for k in ["high", "medium", "low"]:
        labels.append(f"{k.capitalize()} ({counts.get(k,0)})")
        sizes.append(counts.get(k, 0))
        colors_list.append(severity_colors.get(k))

    # render donut with limited width (centered). keep the donut compact so it doesn't become very wide
    # choose donut_width_in up to 4 inches but not wider than page content
    max_width_in = max_width_pts / inch
    donut_width_in = min(4.0, max_width_in)
    fig, ax = plt.subplots(figsize=(donut_width_in, donut_width_in * 0.9))
    wedges, texts, autotexts = ax.pie(
        sizes,
        startangle=140,
        autopct=lambda p: f"{int(round(p/100*sum(sizes)))}" if sum(sizes) else "",
        pctdistance=0.75,
        wedgeprops=dict(width=0.35),
        colors=colors_list,
    )
    ax.axis("equal")
    # smaller legend to avoid overflow
    ax.legend(wedges, labels, title="Severity", loc="lower center", bbox_to_anchor=(0.5, -0.15), ncol=3, fontsize=8)
    plt.setp(texts, fontsize=8)
    plt.setp(autotexts, fontsize=8)
    return fig_to_rl_image(fig, max_width_pts=donut_width_in * inch)


def create_horizontal_metrics_bars(metrics: Dict[str, float], max_width_pts: float):
    labels = list(metrics.keys())
    values = [metrics[k] for k in labels]
    # make a full-width slim bar figure
    fig_width_in = (max_width_pts / inch)
    fig, ax = plt.subplots(figsize=(fig_width_in, 1.9))
    bars = ax.barh(range(len(labels)), values, align='center', color="#2F80ED")
    ax.set_yticks(range(len(labels)))
    ax.set_yticklabels(labels, fontsize=9)
    ax.set_xlim(0, 100)
    ax.xaxis.set_tick_params(labelsize=8)
    for i, v in enumerate(values):
        v_int = int(v)  # ensures it's an integer
        ax.text(v_int + 1, i, f"{v_int}%", va='center', fontsize=8)
    ax.invert_yaxis()
    ax.set_xlabel("Percent", fontsize=9)
    fig.tight_layout(pad=0.5)
    return fig_to_rl_image(fig, max_width_pts=max_width_pts)


def create_issues_bar_chart(issue_types: Dict[str, int], max_width_pts: float):
    labels = list(issue_types.keys())
    values = list(issue_types.values())
    fig_width_in = (max_width_pts / inch)
    fig, ax = plt.subplots(figsize=(fig_width_in, 2.2))
    ax.bar(range(len(labels)), values, color="#4B5563")
    ax.set_ylabel("Count", fontsize=9)
    ax.set_xticks(range(len(labels)))
    ax.set_xticklabels(labels, rotation=45, ha="right", fontsize=8)
    ax.tick_params(axis="y", labelsize=8)
    fig.tight_layout(pad=0.5)
    return fig_to_rl_image(fig, max_width_pts=max_width_pts)

# ---------- main PDF generation ----------
def add_page_number(canvas, doc):
    canvas.saveState()
    page_num_text = f"Page {doc.page}"
    canvas.setFont("Helvetica", 9)
    canvas.setFillColor(colors.grey)
    canvas.drawRightString(A4[0] - 0.5 * inch, 0.4 * inch, page_num_text)
    canvas.restoreState()


def generate_pdf_bytes(payload: Dict[str, Any]) -> bytes:
    """
    payload: JSON object with fields described below in sample_request
    returns: PDF bytes
    """
    # page and margins
    left_margin = 0.5 * inch
    right_margin = 0.5 * inch
    top_margin = 0.6 * inch
    bottom_margin = 0.6 * inch
    page_width, page_height = A4
    content_width = page_width - left_margin - right_margin

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=left_margin,
        rightMargin=right_margin,
        topMargin=top_margin,
        bottomMargin=bottom_margin,
    )
    styles = getSampleStyleSheet()
    # safe custom styles (avoid name collisions)
    styles.add(ParagraphStyle(name="TitleLarge", fontSize=20, leading=24, spaceAfter=8))
    styles.add(ParagraphStyle(name="H2", fontSize=12, leading=14, spaceAfter=6))
    styles.add(ParagraphStyle(name="NormalSmall", fontSize=9, leading=12))
    styles.add(ParagraphStyle(name="CustomCode", fontName="Courier", fontSize=8, leading=10))

    flowables = []

    # -- Cover / header --
    title = payload.get("title", "Security Audit Report")
    contract_name = payload.get("contractName", "contract.sol")
    analysis_meta = payload.get("meta", {})
    date_str = analysis_meta.get("analysisDate") or datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    summary_text = payload.get("executiveSummary", "Comprehensive security analysis report.")

    flowables.append(Paragraph(title, styles["TitleLarge"]))
    flowables.append(Paragraph(f"<b>Contract:</b> {contract_name}", styles["Normal"]))
    flowables.append(Paragraph(f"<b>Date:</b> {date_str}", styles["Normal"]))
    flowables.append(Spacer(1, 10))

    # KPI tiles as a table (4 columns) - reduced font sizes and padding
    kpis = payload.get("kpis", {})
    kpi_labels = [
        ("Security Score", kpis.get("securityScore", "N/A")),
        ("Total Issues", kpis.get("totalIssues", "N/A")),
        ("Gas Efficiency", f"{kpis.get('gasEfficiency', 'N/A')}%"),
        ("Analysis Time", kpis.get("analysisTime", "N/A"))
    ]
    table_data = []
    row = []
    for label, value in kpi_labels:
        # smaller numeric size for compactness
        node = Paragraph(f"<b>{label}</b><br/><font size=14>{value}</font>", styles["Normal"])
        row.append(node)
    table_data.append(row)
    col_w = content_width / 4.0
    t = Table(table_data, colWidths=[col_w] * 4)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#F7F9FB")),
        ("BOX", (0,0), (-1,-1), 0.4, colors.HexColor("#E0E6ED")),
        ("INNERGRID", (0,0), (-1,-1), 0.25, colors.HexColor("#E0E6ED")),
        ("ALIGN", (0,0), (-1,-1), "CENTER"),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
        ("LEFTPADDING", (0,0), (-1,-1), 6),
        ("RIGHTPADDING", (0,0), (-1,-1), 6),
        ("TOPPADDING", (0,0), (-1,-1), 6),
        ("BOTTOMPADDING", (0,0), (-1,-1), 6),
        ("FONTSIZE", (0,0), (-1,-1), 10),
    ]))
    flowables.append(t)
    flowables.append(Spacer(1, 10))

    # Executive summary
    flowables.append(Paragraph("Executive Summary", styles["H2"]))
    flowables.append(Paragraph(summary_text, styles["NormalSmall"]))
    flowables.append(Spacer(1, 12))

    # Visuals: stacked (donut centered, then metrics full width, then issues chart)
    vuln_counts = payload.get("vulnerabilityBreakdown", {"high":0,"medium":0,"low":0})
    metrics = payload.get("metrics", {"Security Coverage":0,"Gas Efficiency":0,"Code Quality":0})

    # Donut (centered)
    donut_img = create_donut_chart(vuln_counts, max_width_pts=content_width)
    donut_img.hAlign = "CENTER"
    flowables.append(donut_img)
    flowables.append(Spacer(1, 10))

    # Metrics (full width)
    metrics_img = create_horizontal_metrics_bars(metrics, max_width_pts=content_width)
    metrics_img.hAlign = "LEFT"
    flowables.append(metrics_img)
    flowables.append(Spacer(1, 12))

    # Issues by type chart (if provided)
    issue_types = payload.get("issuesByType", {})
    if issue_types:
        flowables.append(Paragraph("Issues by Type", styles["H2"]))
        issues_chart = create_issues_bar_chart(issue_types, max_width_pts=content_width)
        flowables.append(issues_chart)
        flowables.append(Spacer(1, 12))

    # Key Findings & Recommendations
    flowables.append(Paragraph("Key Findings & Recommendations", styles["H2"]))
    issues = payload.get("issues", [])
    if not issues:
        flowables.append(Paragraph("No issues found.", styles["NormalSmall"]))
    else:
        for idx, iss in enumerate(issues, start=1):
            heading = f"{idx}. {iss.get('title','Unknown')} — {iss.get('severity','Info').capitalize()}"
            flowables.append(Paragraph(heading, styles["Normal"]))
            meta = f"Line: {iss.get('line','-')} • Type: {iss.get('type','-')}"
            flowables.append(Paragraph(meta, styles["NormalSmall"]))
            flowables.append(Spacer(1,6))
            impact = iss.get("impact", "No specific impact provided.")
            flowables.append(Paragraph(f"<b>Impact</b>: {impact}", styles["NormalSmall"]))
            rec = iss.get("recommendation", "No recommendation provided.")
            flowables.append(Paragraph(f"<b>Recommendation</b>: {rec}", styles["NormalSmall"]))
            flowables.append(Spacer(1,6))
            code_snippet = iss.get("codeSnippet", "").strip()
            if code_snippet:
                flowables.append(Paragraph("<b>Code Snippet</b>:", styles["NormalSmall"]))
                flowables.append(Preformatted(code_snippet, styles["CustomCode"]))
            flowables.append(Spacer(1,12))
    flowables.append(PageBreak())

    # Appendix / metadata
    flowables.append(Paragraph("Appendix & Metadata", styles["H2"]))
    tool_used = payload.get("meta", {}).get("tools", "Krypteon Audit")
    flowables.append(Paragraph(f"Tools: {tool_used}", styles["NormalSmall"]))
    flowables.append(Paragraph(f"Raw payload: (truncated)", styles["NormalSmall"]))
    pretty = json.dumps(payload.get("meta", {}), indent=2)[:2000]
    flowables.append(Preformatted(pretty, styles["CustomCode"]))

    # build document with page numbers
    doc.build(flowables, onFirstPage=add_page_number, onLaterPages=add_page_number)

    buffer.seek(0)
    return buffer.read()


# ---------- FastAPI endpoint ----------
@app.post("/generate-report")
async def generate_report(request: Request):
    """
    Expects: JSON body with structure (see sample in earlier message).
    Returns: PDF as attachment (download).
    """
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Expected JSON object")

    pdf_bytes = generate_pdf_bytes(payload)
    ts = datetime.datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    contract = payload.get("contractName", "contract").replace(" ", "_")
    filename = f"{contract}_audit_{ts}.pdf"

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        },
    )

@app.get("/health")
def health():
    return {"ok": True}

class CodeRequest(BaseModel):
    codeSnippet: str

@app.post("/api/fix-code")
async def fix_code(req: CodeRequest):
    try:
        prompt = f"""
You are a strict, precise smart-contract security auditor and code fixer.
Input is a vulnerable Solidity code SNIPPET. Your job is to return a fixed version of **only that same snippet**, with the **minimal** changes needed to remove vulnerabilities while preserving behavior.

REQUIREMENTS (must follow exactly):
1. OUTPUT ONLY the patched code text. Do NOT add any explanation, comments, headings, code fences (```), or extra text of any kind.
2. Do NOT add imports, file-level wrappers, function wrappers, pragma lines, or extra braces that were not present in the original snippet.
3. Make the absolute minimal edits necessary to remove vulnerabilities (fix logic, sanitize inputs, use safe calls, add checks). Preserve original variable and function names and the snippet's structure whenever possible.
4. Do NOT invent or hallucinate missing context. If the snippet cannot be safely fixed without adding external context, return the original snippet verbatim (no extra text).
5. Do NOT add or remove leading/trailing blank lines except when strictly required by the minimal fix.
6. If multiple valid fixes exist, choose the one that changes the least text (fewest characters) while removing the vulnerability.
7. If you must add small helper checks or short one-line guards, keep them inside the snippet exactly where they belong and do not add any surrounding boilerplate.
8. NEVER include explanatory comments, TODOs, or placeholders like "<...>" in the output.

VULNERABLE SNIPPET START
{req.codeSnippet}
VULNERABLE SNIPPET END
        """

        # Initialize the Gemini model
        model = genai.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content(prompt)

        fixed_code = response.text.strip()

        return JSONResponse(content={"fixedCode": fixed_code})

    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)
    
DEFAULT_JSON_TEMPLATE = {
    "title": "N/A",
    "contractName": "N/A",
    "executiveSummary": "N/A",
    "meta": {
        "analysisDate": "N/A",
        "analysisDurationSeconds": 0,
        "tools": [],
        "auditor": "N/A",
        "network": "N/A",
        "compiler": "N/A",
        "optimizer": "N/A"
    },
    "kpis": {
        "securityScore": 0,
        "totalIssues": 0,
        "gasEfficiency": 0,
        "analysisTime": 0
    },
    "vulnerabilityBreakdown": {
        "high": 0,
        "medium": 0,
        "low": 0
    },
    "metrics": {
        "Security Coverage": 0,
        "Gas Efficiency": 0,
        "Code Quality": 0,
        "Documentation": 0
    },
    "issuesByType": {},
    "issues": []
}

class AuditSession(BaseModel):
    result: dict
    contractName: str
    analysisTime: str

def merge_defaults(template: dict, data: dict) -> dict:
    """
    Recursively merge default template with actual data.
    Missing keys are filled from template.
    """
    for key, value in template.items():
        if key not in data:
            data[key] = value
        elif isinstance(value, dict) and isinstance(data[key], dict):
            merge_defaults(value, data[key])
    return data

@app.post("/api/format-audit-json")
async def format_audit_json(data: AuditSession):
    try:
        # Build strict prompt for Gemini
        prompt = f"""
You are a precise JSON formatter and smart contract auditor assistant.
Input: raw audit analysis data (from session storage).

Task:
Convert the input data into the following **exact JSON structure** with all fields:
- title
- contractName
- executiveSummary
- meta (analysisDate, analysisDurationSeconds, tools, auditor, network, compiler, optimizer)
- kpis (securityScore, totalIssues, gasEfficiency, analysisTime)
- vulnerabilityBreakdown (high, medium, low)
- metrics (Security Coverage, Gas Efficiency, Code Quality, Documentation)
- issuesByType
- issues (with title, severity, type, line, impact, recommendation, codeSnippet)

Important rules:
1. Output only JSON. Do NOT add explanations, comments, markdown, or extra text.
2. Map all input data to this structure as completely as possible.
3. Fill missing fields with reasonable defaults (numbers=0, strings="N/A") if needed.
4. Do not hallucinate extra vulnerabilities or fake data.

RAW SESSION DATA START:
{data.model_dump_json()}
RAW SESSION DATA END
"""

        # Initialize Gemini model
        model = genai.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content(prompt)
        formatted_json = response.text.strip()

        # Clean Markdown code blocks if present
        if formatted_json.startswith("```"):
            formatted_json = formatted_json.strip("`")
            if formatted_json.lower().startswith("json"):
                formatted_json = formatted_json[4:].strip()

        # Parse JSON safely
        try:
            formatted_data = json.loads(formatted_json)
        except json.JSONDecodeError:
            print("Invalid JSON from Gemini model:", formatted_json)
            return JSONResponse(
                content={
                    "error": "Invalid JSON from Gemini model",
                    "raw_response": formatted_json,
                    "default_data": DEFAULT_JSON_TEMPLATE
                },
                status_code=500
            )

        # Merge defaults for any missing fields
        merged_data = merge_defaults(DEFAULT_JSON_TEMPLATE, formatted_data)

        return JSONResponse(content=merged_data)

    except Exception as e:
        print("Unexpected error:", str(e))
        return JSONResponse(content={"error": str(e)}, status_code=500)
    

class CodeRequest(BaseModel):
    codeSnippet: str

@app.post("/api/explain-issue")
async def explain_issue(req: CodeRequest):
    try:
        prompt = f"""
You are an expert smart-contract security auditor and educator. Your task is to explain the security issue in the provided code snippet and provide detailed recommendations for optimization.

Please provide:
1. A clear explanation of what the vulnerability is in 2-3 sentences
2. Why it's problematic in 1 sentence
3. Specific recommendations for fixing it in 2 sentence
4. Best practices to prevent similar issues in 2 sentence
Don't suggest anything beyond 6-7 points.
Be technical but accessible. Focus on practical advice that a developer can implement.

VULNERABLE CODE SNIPPET:
{req.codeSnippet}

Please structure your response in a clear, organized manner.
        """

        # Initialize the Gemini model
        model = genai.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content(prompt)

        explanation = response.text.strip()

        return JSONResponse(content={"explanation": explanation})

    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)
    
import requests, os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from urllib.parse import urlparse

app = FastAPI()

class GithubRepoRequest(BaseModel):
    repoUrl: str

@app.post("/api/github/solidity-files")
async def get_sol_files(req: GithubRepoRequest):
    parsed_url = urlparse(req.repoUrl)
    parts = parsed_url.path.strip('/').split('/')
    if len(parts) < 2:
        raise HTTPException(status_code=400, detail="Invalid GitHub URL")
    owner, repo = parts[:2]

    headers = {}
    token = os.getenv("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"token {token}"

    def fetch_dir(path=""):
        url = f"https://api.github.com/repos/{owner}/{repo}/contents/{path}"
        r = requests.get(url, headers=headers)
        if r.status_code != 200:
            raise HTTPException(status_code=r.status_code, detail="Failed to fetch")
        data = r.json()
        files = []
        for item in data:
            if item["type"] == "file" and item["name"].endswith(".sol"):
                # download_url gives raw text directly
                content = requests.get(item["download_url"]).text
                files.append({"name": item["name"], "path": item["path"], "content": content})
            elif item["type"] == "dir":
                files.extend(fetch_dir(item["path"]))
        return files

    return {"files": fetch_dir()}
