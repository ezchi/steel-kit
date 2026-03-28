## **Steel-Kit: Dual-Agent AI Development Framework**

**Steel-Kit** is a high-performance development toolkit inspired by `github/spec-kit`. It leverages a **Dual-Agent Architecture** to bridge the gap between "Generative AI" and "Production-Ready Software." 

By separating the **Creator** (Main LLM) from the **Inspector** (Reviewer LLM), Steel-Kit ensures that every output is not just generated, but audited, refined, and hardened.

---

### ### Core Philosophy
Most AI kits rely on a single prompt-response loop. **Steel-Kit** treats AI development like a high-stakes engineering floor:
1.  **The Forge (Primary LLM):** Executes the main task, writes code, or generates content.
2.  **The Gauge (Inspector LLM):** Critiques the output against constraints, checks for hallucinations, and validates logic.
3.  **The Tempering:** A recursive loop where the Forge adjusts based on the Gauge’s feedback until the "Steel" is hardened.

---

### ### Key Features
* **Multi-Model Orchestration:** Use a heavy-duty model (e.g., GPT-4o or Claude 3.5 Sonnet) for the Forge and a fast, cost-effective model (e.g., Gemini 1.5 Flash) for the Gauge.
* **Structured Inspection:** Built-in schemas for the Inspector to check for security vulnerabilities, PEP8/Linting compliance, or logical fallacies.
* **Pluggable Architecture:** Easily swap LLM providers or local models (via Ollama/vLLM).
* **Stateful Memory:** Maintains context across the "Critique-Refine" cycles to prevent circular logic.

---

### ### Quick Start

#### **1. Installation**
```bash
npm install @steel-kit/core
# or
pip install steel-kit
```

#### **2. Basic Usage**
```typescript
import { SteelKit } from 'steel-kit';

const agent = new SteelKit({
  forge: 'gpt-4o',
  gauge: 'claude-3-haiku'
});

const result = await agent.execute({
  task: "Write a thread-safe singleton in C++",
  constraints: ["Must use std::call_once", "No raw pointers"]
});

console.log(result.hardenedOutput);
console.log(result.inspectionReport); // View what the Inspector caught!
```

---

### ### Project Structure
* `/src/forge`: Logic for the primary task execution.
* `/src/gauge`: Logic for the oversight and validation layers.
* `/templates`: Pre-defined "Inspection Checklists" for common tasks (Code Review, Unit Testing, Documentation).

---

### ### Why "Steel"?
In metallurgy, steel is iron that has been refined and tempered. We believe AI output should go through the same process. Raw LLM output is "Iron"—useful, but prone to breaking. **Steel-Kit** adds the carbon and the heat to make it professional-grade.

---

### ### Contributing
We welcome contributions to the **Gauge Library**. If you have a set of prompts or logic that effectively catches LLM errors, please submit a PR!

---

**Would you like me to expand on the "Inspection Checklists" or help you write the core logic for the "Gauge" (Inspector) component?**
