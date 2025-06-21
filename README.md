# 🧠 TaskFi

<img width="800" alt="Screenshot 2025-06-21 at 23 16 11" src="https://github.com/user-attachments/assets/b13fa9b0-6c9c-4610-aa22-e77e0967751e" />


[![Deployed on Vercel](https://img.shields.io/badge/live-demo-TaskFi-%23000000?logo=vercel&style=for-the-badge)](https://task-fi-zeta.vercel.app/)

**TaskFi** is a minimalist, crypto-powered anti-procrastination app built on Polygon (testnet: Amoy for now). Users stake crypto to commit to personal tasks, upload proof when complete, and reclaim their stake if successful — or risk losing it to others. It blends the power of **financial incentives** with **human accountability**, with AI verifying proof of completion.

---

## Business Case

Blockchain adoption has often leaned toward deeply technical, niche use cases. But mass adoption for crypto and Polygon will come from **simple, relatable apps** that solve real problems, especially those with the potential for **virality**.

One such problem? **Procrastination**.

Primary data collected from our team on university campuses (in 2022) show that **100% of students procrastinate regularly**. This is a massive issue, and so far the endless list of productivity apps haven’t solved it.

<img width="608" alt="Screenshot 2025-06-21 at 23 18 32" src="https://github.com/user-attachments/assets/709032a8-ce28-409c-a639-8f9268f145ba" />


We followed the startup adage: **build a solution for a real problem** — and built TaskFi.

---

## 🎯 How It Works

This app tackles procrastination using two powerful motivators:

1. 💸 **Monetary Commitment** — Users stake POL against their goals. Failing to follow through costs them.
2. 👀 **Human Accountability** — Tasks are public by default. Others can see your progress or failure, adding social pressure.

Combining these elements, TaskFi becomes a natural productivity tool with real incentives, all backed by verifiable, transparent smart contracts.

To add a fun, viral mechanic: users who frequently complete meaningful tasks can **claim a portion of forfeited deposits** from users who fail theirs. This is governed by a **Claim Score** system.

---

## 🔨 Tech Stack

| Layer            | Technology                          |
|------------------|--------------------------------------|
| Frontend         | Next.js, TailwindCSS, Web3Modal      |
| Smart Contracts  | Solidity                             |
| Web3 Integration | Ethers.js                            |
| Network          | Polygon Amoy                         |
| Hosting          | [Vercel](https://task-fi-zeta.vercel.app/) |
| Agent            | AI verification of task proofs       |

---

## 🚀 Features

- ✅ **Add a Task**: Commit to any task with a user-defined stake and timeline (in hours).
- 📎 **Submit Proof**: Upload proof in the form of an image to IPFS or any public URL before the deadline.
- 🤖 **AI Checking**: An AI agent evaluates submitted proof for validity.
- 💰 **Claim Funds**:
  - If your task is valid → reclaim your stake.
  - If your task fails → others can claim the deposit.
- 📉 **Fail a Task**: If you miss the deadline, others will split the forfeited funds based on their claim scores.
  - Claim Score = (average task quality × stake value × completion rate)
  - Meaningless or low-effort tasks won’t boost your score.

---

## 🧪 How to Run Locally

### 1. Clone the Repo

bash
git clone https://github.com/phatdot1/taskfi.git
cd taskfi

### 2. Install Dependencies
npm install

### 3. Add Environment Variables
Create a .env.local file with your Web3Modal project ID:

NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_project_id
You'll also need POL (Polygon testnet) in your connected wallet.

###4. Start the Dev Server
npm run dev
Then visit: http://localhost:3000


## More images:

### Submitting proof to AI via IPFS
<img width="295" alt="Screenshot 2025-06-21 at 23 30 22" src="https://github.com/user-attachments/assets/e9a9d74a-994e-4475-a009-38014f3b0164" />

### Awaiting AI to check 
<img width="1268" alt="Screenshot 2025-06-21 at 23 31 58" src="https://github.com/user-attachments/assets/380795d8-c5b8-466f-aaa9-3330b518ec26" />

### Successfull claim
<img width="1244" alt="Screenshot 2025-06-21 at 23 27 34" src="https://github.com/user-attachments/assets/b2baa5ac-682f-473e-8a5a-e9a490fccaa4" />

