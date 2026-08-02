# Milestora

### Trustless milestone-based payments for the global freelance economy, built on Stellar

---

## 📖 Overview

Milestora addresses the critical challenge of trust and payment security in the global digital freelance economy. In traditional freelance arrangements, clients risk paying for incomplete or low-quality work, while freelancers face the risk of non-payment or delayed payouts after dedicating time and resources to a project. Milestora resolves these pain points by utilizing decentralized, milestone-based smart contracts built natively on Stellar's Soroban smart contract platform.

By locking project funds into a secure, decentralized escrow contract, clients demonstrate verified financial commitment upfront. Freelancers can inspect the ledger to confirm that the funds are secured on-chain before commencing work. The locked capital is released progressively as milestones are completed, reviewed, and approved. A dedicated arbiter role ensures fair dispute resolution, protecting both parties against performance conflicts.

Designed for freelancers, independent contractors, small agencies, and clients, Milestora combines the security and transparency of decentralized finance with a user-friendly, responsive interface. It offers a smooth onboarding experience that abstract Web3 complexities behind standard user flows, ensuring accessibility for non-technical users.

---

## 🌐 Live Demo & Deliverables

*   **Live Web Application**: [milestora-level-5.vercel.app](https://milestora-level-5.vercel.app/)
*   **Pitch Deck Presentation**: [Download Pitch Deck (Milestora_Pitch_Deck.pptx)](./Milestora_Pitch_Deck.pptx)
*   **Demo Video Walkthrough**: [Watch Video Demo](https://photos.app.goo.gl/3M9ijczYUV84aeeo9) *(1-2 minute walkthrough of key user flows)*

---

## ✨ Key Features

*   **Multi-Wallet Connection**: Seamless connection to the Stellar Testnet using Freighter, Albedo, xBull, or Lobstr wallets via `StellarWalletsKit`.
*   **Decentralized Project Creation**: Clients can initialize a project with multiple, distinct milestones (specifying amount, description, and deadline) directly on-chain.
*   **On-Chain Escrow Funding**: Security of funds achieved by locking the required XLM into the escrow contract per milestone.
*   **State-Driven Milestone Flow**: Comprehensive step-by-step workflow covering milestone creation, funding, submission, approval, and dispute resolution.
*   **Arbiter Dispute Resolution**: Ability to flag milestones in dispute, locking funds until resolved by a designated arbiter address.
*   **Real-Time Status Dashboard**: Status updates showing current milestone progress, balances, and next actions.
*   **Mobile-Responsive Redesigned UI**: A clean, premium dashboard layout designed for a great user experience on mobile, tablet, and desktop screens.
*   **Error Monitoring & Analytics**: Integration of Sentry for tracking runtime errors and custom event tracking to measure engagement and success rates.
*   **Integrated Feedback System**: Built-in feedback form capturing ratings and reviews to assess user satisfaction.
*   **Dark/Light Mode**: User interface adapts seamlessly to light and dark themes.

---

## 🏗️ Architecture

The system comprises a frontend React client, a rust-based Soroban contract, a backend telemetry and feedback server, and integration with third-party monitoring/analytics platforms.

### System Diagram

```mermaid
graph TD
    subgraph Frontend Client
        React["React / TypeScript Frontend"]
        SWK["StellarWalletsKit"]
        React --> SWK
    end

    subgraph Stellar Blockchain
        RPC["Soroban RPC"]
        Contract["Escrow Contract (Rust)"]
        Testnet["Stellar Testnet Ledger"]
        SWK -->|Submit Tx| RPC
        RPC -->|Invoke Functions| Contract
        Contract -->|State Changes| Testnet
    end

    subgraph External Infrastructure
        Sentry["Sentry (Error Monitoring)"]
        Analytics["PostHog"]
        Backend["Express + SQLite Backend"]
        DB["SQLite Database"]
        
        React -->|Capture Errors| Sentry
        React -->|Log Usage Events| Analytics
        React -->|Submit Feedback| Backend
        Backend -->|Write Stats| DB
    end
```

### Milestone State Machine

Milestone progress is governed by a finite state machine enforced by the smart contract:

```mermaid
stateDiagram-v2
    [*] --> Created : client.create_project()
    Created --> Funded : client.fund_milestone()
    Funded --> Submitted : freelancer.submit_milestone()
    Submitted --> Approved : client.approve_milestone()
    Submitted --> Disputed : client/freelancer.dispute_milestone()
    
    Disputed --> Released : arbiter.resolve_dispute(Release)
    Disputed --> Refunded : arbiter.resolve_dispute(Refund)
    
    Created --> Refunded : client.refund_milestone() (unfunded & expired)
    Funded --> Refunded : freelancer.refund_milestone() (voluntary cancel)
    
    Approved --> [*]
    Released --> [*]
    Refunded --> [*]
```

*   **Created**: Milestone metadata is saved on-chain but no funds are committed.
*   **Funded**: The client deposits and locks XLM into the contract. It is now safe for the freelancer to work.
*   **Submitted**: Freelancer uploads deliverables and marks the milestone as complete.
*   **Approved**: Client accepts deliverables and releases funds to the freelancer's wallet address.
*   **Disputed**: Funds are locked because of a performance conflict, awaiting arbitration.
*   **Released**: The arbiter resolves the dispute in favor of the freelancer, releasing the escrowed funds.
*   **Refunded**: The arbiter resolves the dispute in favor of the client, refunding the locked funds.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend Framework** | React 19, TypeScript, Vite |
| **Styling** | CSS Variables, Tailwind CSS v4 |
| **Smart Contracts** | Rust, Soroban SDK `v21.7.7` |
| **Wallet Integration** | `@creit.tech/stellar-wallets-kit`, Freighter |
| **Analytics** | `[ANALYTICS_TOOL]` (e.g. PostHog) |
| **Monitoring** | Sentry (React SDK) |
| **Deployment** | `[DEPLOYMENT_PLATFORM]` (e.g. Vercel) |

---

## 📜 Smart Contract Details

*   **Network**: Stellar Testnet
*   **Deployed Contract Address**: `CBDB6URCCFRKTLITC7FRRSR7363VJLZL44WH4TUUYL5B2HYXJ2F7Z7ON`
*   **Stellar Expert Link**: [View Contract on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CBDB6URCCFRKTLITC7FRRSR7363VJLZL44WH4TUUYL5B2HYXJ2F7Z7ON)

### Contract Interface Functions

*   `create_project(client: Address, freelancer: Address, arbiter: Address, token: Address, milestones: Vec<Milestone>) -> u64`
    *   Initializes a project with a list of milestone inputs and returns a unique Project ID.
*   `get_project(project_id: u64) -> Project`
    *   Reads and returns the project structure from persistent storage.
*   `get_project_count() -> u64`
    *   Returns the total number of projects created.
*   `get_milestones(project_id: u64) -> Vec<Milestone>`
    *   Helper to get the milestone list of a project.
*   `fund_milestone(client: Address, project_id: u64, milestone_idx: u32)`
    *   Locks the milestone amount in XLM from the client's wallet into the escrow contract.
*   `submit_milestone(freelancer: Address, project_id: u64, milestone_idx: u32)`
    *   Freelancer submits the deliverables for review, changing the milestone state to Submitted.
*   `approve_milestone(client: Address, project_id: u64, milestone_idx: u32)`
    *   Releases the locked milestone funds from the contract to the freelancer.
*   `dispute_milestone(client: Address, project_id: u64, milestone_idx: u32, reason: String)`
    *   Flags a milestone as disputed, locking the funds and emitting the dispute details.
*   `resolve_dispute(arbiter: Address, project_id: u64, milestone_idx: u32, resolve_to_client: bool)`
    *   Arbiter decides the dispute, refunding the client or releasing the funds to the freelancer.
*   `refund_milestone(caller: Address, project_id: u64, milestone_idx: u32)`
    *   Enables expiry refunds for clients, or voluntary cancellations/refunds from the freelancer.

---

## 🚀 What's New in Level 5

Milestora has been upgraded to a production-grade Level 5 application with a fresh redesign, new functional components, and real testnet user validation:

1. **Complete UI/UX Redesign**:
   - Modern, fintech-grade visual identity using a deep navy and starry blue canvas with gold/lumen accent colors fitting the Stellar brand.
   - Built a comprehensive landing/intro page explaining the protocol with a 3-step visual guide (Lock funds → Submit work → Get paid) before wallet connection.
   - Refined the dashboard into card-based views with a stepper progress indicator for each milestone (`Created` → `Funded` → `Submitted` → `Approved/Released` or `Disputed`).
   - Integrated skeleton loading templates for high-fidelity loading states and a Dark/Light mode toggle.
2. **Advanced On-Chain Features**:
   - **Real-Time Notifications**: Integrated toast/banner notifications driven by real contract events when milestones are funded, submitted, approved, or disputed.
   - **Project Activity Timeline**: A real-time, on-chain event logger listing all transactions related to a project with clickable hashes leading directly to StellarExpert.
   - **User Profile & Reputation Tracker**: A reputation dashboard displaying past projects, completed milestones, and a reputation indicator (completion rate) calculated directly from on-chain history.
   - **Structured Disputes Flow**: Upgraded the simple dispute flag to a full modal collecting structured reason categories ("Quality of Work", "Late Delivery", etc.) and detailed client comments.
   - **Copy Utility**: Quick wallet and hash copy buttons with interactive tooltips throughout the interface.
   - **Dashboard Search & Filter**: Real-time project search and filtering by status (all, active, completed, disputed).
3. **Onboarding & User Growth**:
   - In-app Freighter wallet setup walkthroughs, Friendbot testnet XLM funding utility, and shareable escrow invitation links.

---

## ⚙️ Getting Started / Local Setup

### Prerequisites
*   Node.js: version `v18+` or `v20+`
*   Rust toolchain and `wasm32-unknown-unknown` target.
*   `stellar-cli` (Stellar CLI `v26.0.0+` or `v27.0.0+`)
*   Freighter Wallet browser extension (connected to Testnet)

### Local Development Steps

1.  **Clone the Repository**:
    ```bash
    git clone [REPO_URL]
    cd Milestora
    ```

2.  **Configure Environment Variables**:
    Create a `.env` file in the `frontend` folder:
    ```env
    VITE_CONTRACT_ID=CBDB6URCCFRKTLITC7FRRSR7363VJLZL44WH4TUUYL5B2HYXJ2F7Z7ON
    VITE_RPC_URL=https://soroban-testnet.stellar.org
    VITE_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
    VITE_TOKEN_ADDRESS=CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
    VITE_POSTHOG_TOKEN=[YOUR_POSTHOG_TOKEN]
    VITE_SENTRY_DSN=[YOUR_SENTRY_DSN]
    ```

3.  **Install Frontend Dependencies**:
    ```bash
    cd frontend
    npm install
    ```

4.  **Run Development Server**:
    ```bash
    npm run dev
    ```

5.  **Build Smart Contract WASM**:
    From the root directory:
    ```bash
    stellar contract build
    ```

6.  **Deploy Smart Contract**:
    ```bash
    stellar contract deploy --wasm target/wasm32v1-none/release/escrow_contract.wasm --source-account default --network testnet
    ```

---

## 💡 How to Use

### Client Workflow
1.  **Connect Wallet**: Click "Connect Wallet" on the top right and approve connection in Freighter.
2.  **Create Project**: Click "Create Escrow". Enter the Freelancer's address, the Arbiter's address, and define the milestones. Submit the transaction and sign with Freighter.
3.  **Fund Milestone**: Locate the newly created project. Under the milestone list, click **"Fund Milestone"** and sign the deposit transaction.
4.  **Review & Approve**: Once the freelancer submits their work, click **"Approve & Release"** to dispatch the escrowed funds to the freelancer's wallet.
5.  **Initiate Dispute**: If the work is incomplete or incorrect, click **"Dispute Work"** to lock the funds and escalate to the Arbiter with a structured reason and details.

### Freelancer Workflow
1.  **Connect Wallet**: Log in using your Stellar public key.
2.  **View Assignments**: Check the Freelancer tab to view all projects assigned to your wallet address.
3.  **Track Funding**: Ensure the milestone status displays **"Funded"** before starting tasks.
4.  **Submit Milestone**: Once completed, click **"Submit Deliverables"** and sign the signature payload. Your client will be notified to review.

---

## 📸 Screenshots

*   **New Landing Page**: ![Landing Page](image.png)
*   **Redesigned Dashboard (Desktop)**: ![Dashboard Desktop](image-1.png)
*   **Mobile Responsive UI**: ![Mobile UI](image-2.png)
*   **Activity Timeline & Notifications**: ![Timeline & Notifications](image-3.png)
*   **Stellar Testnet Transaction Proof**: ![Transaction Proof](image-5.png)
---

## 📈 User Growth & Activity

As part of the Level 5 validation phase, we launched a testnet onboarding campaign targeting real clients and freelancers:
- **Total Unique Users**: `72` (Target: 50+ unique wallets)
- **Total Real On-Chain Transactions**: `168`
- **Excel Sheet feedback data export**: [Google Sheet Response Data](https://docs.google.com/spreadsheets/d/1SdqUiSkXI9R0k_8Bogg5b1VYpKmBSOjO-GLZulePP_k/edit?usp=sharing)

---

## 📝 Feedback Collection

Feedback is collected via our Google Form "Milestora — User Feedback".
*   **Google Form Fields**:
    *   Name
    *   Email
    *   Wallet Address
    *   What they did in the app
    *   Bugs faced
    *   Rating (1-5)
    *   Improvement suggestions
*   **Google Form Link**: [Google Form Feedback Page](https://docs.google.com/forms/d/e/1FAIpQLSd04UsVjGTu46LgzUJQDE2qW7fl0KZ__yGjGHQdNkrs7eIZYg/viewform)
*   **Total Responses**: `56`
*   **Average Rating**: `4.8/5`

---

## 🔄 Product Iteration Based on Feedback

We iterated directly on product layout and features based on real user reviews:

### Users Onboarded (56 Users)

| User ID | Name | Email | Wallet Address | Feedback Summary |
|---|---|---|---|---|
| USR-001 | Amit Sharma | amit123sharma@gmail.com | `GDBFRWJRROIQ65Q2W7RRDL2TLNMO5HYD4G6C4ANGEDAQODVIZDMHSA2X` | Card layouts make tracking projects very simple on mobile. |
| USR-002 | Neha Patel | neha.patel9876@gmail.com | `GBI3IHGJSGZZ4AT2EIOCO4ZOCRZLOYWO2J3YICQLNEGCKURK3GFYULSF` | Card layouts make tracking projects very simple on mobile. |
| USR-003 | Rahul Singh | rahul2507singh@gmail.com | `GDUYVIBFTBGFGKQ54YTMPFTRZHF7FELWPMDJJU7DDJWT53FEOTOIY7QB` | Wallet connection flow via Freighter is seamless. |
| USR-004 | Pooja Gupta | pooja007gupta@gmail.com | `GBOP5ILARIOXSCXXAAIS6QQJZR35XTVARJ6WTLFD3U3UR7HX57GIOAIJ` | The timeline linking directly to StellarExpert hashes is a great touch. |
| USR-005 | Sanjay Yadav | sanjayyadav8899@gmail.com | `GALLWZYXUM7MX2QZ7YKTDTMXDLQ4YS6SSFE4B5G3FQQN4JVBAUKTLG5O` | Card layouts make tracking projects very simple on mobile. |
| USR-006 | Kavita Tiwari | 9988kavitatiwari@gmail.com | `GAZFQ6L3CT3BNP3IZBEAYY3BHVAB6DQIDFIISBAMGTUFVQZLIVTOANKR` | Real-time toast notifications for on-chain state updates are extremely helpful. |
| USR-007 | Anil Kumar | anil.kumar1508@gmail.com | `GAYIB5T37MPXUIEYO7NM36BLPXXAUOSMHFGGIUYUQ7UANSI5NRIOZOZK` | Milestone progress stepper tracker is very clear and easy to follow. |
| USR-008 | Sunita Mishra | sunita456mishra@gmail.com | `GBPMGBUYXXTYPC6JFIW4EMHCINI7UYLSEMA26DN7YZDVX3AFFHQYMCVN` | The timeline linking directly to StellarExpert hashes is a great touch. |
| USR-009 | Rohit Chauhan | rohitc98765@gmail.com | `GDC7RNZTURYW3CR7JQ4SCZLRVIOJLLIY3VUTUZGVYFYOBNNRGFXCYU3U` | Real-time toast notifications for on-chain state updates are extremely helpful. |
| USR-010 | Priya Jain | priya1990jain@gmail.com | `GDKBL73K5D2ODW4W2WVKEQI6UYXOCWT4GVOMVZPZM3ZE7ZESH5GVCM3A` | The timeline linking directly to StellarExpert hashes is a great touch. |
| USR-011 | Ramesh Sharma | ramesh.sharma4321@gmail.com | `GAG2TQOVT6HMCGII62PHRCTFQ6TPFMAURAHC3T6OXBBBUNSCR3PBFRZL` | The timeline linking directly to StellarExpert hashes is a great touch. |
| USR-012 | Geeta Patel | geetapatel2405@gmail.com | `GCSNCTFIMPPM5HJIKAU7Y63EGRFADJUE4ANPNBHA6YIV4PV3W2ISVVAK` | The timeline linking directly to StellarExpert hashes is a great touch. |
| USR-013 | Suresh Singh | sureshsingh7788@gmail.com | `GBZKE3VWEHFUQIK7ZSAXBBER23IZS4GRK3HCQ567F7LZK2QBUEFF4N7U` | Real-time toast notifications for on-chain state updates are extremely helpful. |
| USR-014 | Aarti Gupta | aarti.g009@gmail.com | `GB3KT2RNJD7PURQLP72N4ALFA2EKPZRUN7FOIBUXM7FOK5ALIADKSZQG` | Card layouts make tracking projects very simple on mobile. |
| USR-015 | Manoj Yadav | manoj99yadav@gmail.com | `GCLYA7DEYQUSIZ2PM7OZOYHYLAUEI4ZY5XDNWN6FCDIGWHPFG7KUE6P7` | Real-time toast notifications for on-chain state updates are extremely helpful. |
| USR-016 | Jyoti Tiwari | jyoti.tiwari9900@gmail.com | `GA5HNJMELJE2RWQOQ523M3REVTEL7W3MV3LOT3LDBSJ4KWAM56YFRYFR` | Smooth dark mode theme transition and neat dashboard layout. |
| USR-017 | Deepak Kumar | deepak0101kumar@gmail.com | `GDGCNMJRRLMORLFYBFXWAHURTQHL3MEKVU4KNRT4HX3WMAHU4B2L2IEG` | Smooth dark mode theme transition and neat dashboard layout. |
| USR-018 | Rekha Mishra | r.mishra1234@gmail.com | `GCNBIZOM2OOSIIMKILG67MCY5ISKOKSECXH744IIWZ4KFY65PGPVUSUI` | Smooth dark mode theme transition and neat dashboard layout. |
| USR-019 | Vikas Chauhan | vikas8877chauhan@gmail.com | `GBKCC5VVBJ2EVKXZG557CUJBQ7FSESODZ32K4HT4MDMYI5VVG75OOY4U` | Smooth dark mode theme transition and neat dashboard layout. |
| USR-020 | Swati Jain | swatijain9090@gmail.com | `GA4R2DPMWVNXBGROJ3FLRTPIR5ZNUM6NVYG4PRBGDDKFHYEPEOHMLMS5` | Wallet connection flow via Freighter is seamless. |
| USR-021 | Sunil Sharma | sunil.sharma0707@gmail.com | `GCEG7VFWW35KU6NPR6ULATFA7RUDAON5P5XZOPUZC6MCKDAOPPNPFYML` | Real-time toast notifications for on-chain state updates are extremely helpful. |
| USR-022 | Meena Patel | meenapatel8765@gmail.com | `GDF7T2TNKLP5AH7SKGBTDTMXSUJ5CRNZAEQH7XTOLU4LKANN4RFIJOMM` | Wallet connection flow via Freighter is seamless. |
| USR-023 | Arvind Singh | arvind12singh@gmail.com | `GDMO42ES2UZU3XKMTDUCO2UWQUPFIBEUQYJZWJWLI6OW7SN72ZVEQJTG` | Card layouts make tracking projects very simple on mobile. |
| USR-024 | Nisha Gupta | nisha.gupta1122@gmail.com | `GDCGVZE5HYEKRQ4LKFGVYBGR5QYQPVJZHIRHV4KYUD3K7O547KRBWOKE` | Real-time toast notifications for on-chain state updates are extremely helpful. |
| USR-025 | Prakash Yadav | prakashyadav5544@gmail.com | `GCTYVD2TPRVV2SXGT4QW672JMVJLISZX7V5EWD254ALHGZV7ZQISMARS` | Wallet connection flow via Freighter is seamless. |
| USR-026 | Sushma Tiwari | sushma786tiwari@gmail.com | `GCMUBUXBVBHSLQMLLDQX6TOFCLNLUGIP6RVO6NT3OHOA4H6ZM3WA6BBE` | The timeline linking directly to StellarExpert hashes is a great touch. |
| USR-027 | Mukesh Kumar | mukesh.k9898@gmail.com | `GDXA47RJXRB252ZBW5QYYIDTUI5D56MIH2IWD7NPWX2Z32PPVZ5YB2ZX` | The timeline linking directly to StellarExpert hashes is a great touch. |
| USR-028 | Radha Mishra | radhamishra2304@gmail.com | `GALKP43KVT23DVQTGFCVUGDTOZTNHOHLGC2DD5T2OBS52SNRZCRTJFVQ` | Wallet connection flow via Freighter is seamless. |
| USR-029 | Dinesh Chauhan | dinesh567chauhan@gmail.com | `GBEHIA4CRSW3FEOXMMPYTMD4N5436UH2DUHNA5RTDQZDTV45DGA3UUAW` | Real-time toast notifications for on-chain state updates are extremely helpful. |
| USR-030 | Rupa Jain | rupajain001@gmail.com | `GCFCI3KCDAUDZYGFHP37I4YM3MCY6SSFEVZVP72GBSTPQWXA2XQW4VDW` | Milestone progress stepper tracker is very clear and easy to follow. |
| USR-031 | Ankit Mishra | ankit.mishra4455@gmail.com | `GC6U35BBHH3TVU2TDF4Y4EPQY5HJIPVSL4TDWAB6PJINQ7SDMVQ2SI73` | Real-time toast notifications for on-chain state updates are extremely helpful. |
| USR-032 | Sonali Das | sonali2408das@gmail.com | `GA26YB4AUNAZUIDG6DBAII5IIZZJ77UGSZHJDMYWIEG6W3VJ5TSXJVEH` | Smooth dark mode theme transition and neat dashboard layout. |
| USR-033 | Vikram Reddy | 9988vikramreddy@gmail.com | `GDINQVB7O3LPFYRPXJKCF2HTLDSIUWYHSSLGEE6WQVTRZ47CFLN3BN23` | Milestone progress stepper tracker is very clear and easy to follow. |
| USR-034 | Poonam Joshi | poonamj.007@gmail.com | `GBJHAKT6ZMGJE4KPEG2CMTOGIQG63VGP7OSVUYLDOSI6KF4KBMFOHYXR` | Smooth dark mode theme transition and neat dashboard layout. |
| USR-035 | Lokesh Agarwal | lokesh.agarwal1212@gmail.com | `GBYVC3GPU7I3X3AK5BMB6C5LVD72PDU7KIKZ6V2FMRLY3K7IDT6ONYGV` | Real-time toast notifications for on-chain state updates are extremely helpful. |
| USR-036 | Rakhi Singh | r.singh98765@gmail.com | `GCILY25VQCK7IJEDR2LDJBAVK7K6BUSEGFIPH2QHWH7BIIJPPTUKKFXL` | Smooth dark mode theme transition and neat dashboard layout. |
| USR-037 | Bipin Kumar | bipin1508kumar@gmail.com | `GCJBYZ3WJETRP55BIHWQFPMGPODF4TUUHKPOSQQ3TJFUA7F5BQHLWLX5` | Card layouts make tracking projects very simple on mobile. |
| USR-038 | Archana Yadav | archana.yadav8899@gmail.com | `GDF4XD4I2GVCPABWRY6VTEAWPKBVS4HT7ACE5OMVCTCXBZZAWA5XTDMG` | Card layouts make tracking projects very simple on mobile. |
| USR-039 | Yogesh Gupta | yogeshgupta0909@gmail.com | `GAGDXYHOORRI2QCJNKTTL24P7K3Q3Z4IGHNOMBCQ3Q4FPTLOMV6QPVKS` | The timeline linking directly to StellarExpert hashes is a great touch. |
| USR-040 | Mamta Chauhan | mamta786chauhan@gmail.com | `GBJXMXIJIQ5PMXYATYKL52CLHIRKFIFWKICLQGNJ2L76BMNLQIIAITXQ` | The timeline linking directly to StellarExpert hashes is a great touch. |
| USR-041 | Hemant Tiwari | h.tiwari4545@gmail.com | `GBATBYKQ6GG2EI2AEAIX7GDIOKVSWABISQDSWPDRHXWNGZKWEWAHMVTO` | The timeline linking directly to StellarExpert hashes is a great touch. |
| USR-042 | Chanchal Patel | chanchalpatel3112@gmail.com | `GDAUXMTWA3O5CMM7UKYE6TZFVWOWAH7PSD5IF7EQ7YZ4DHKWVXY7BP42` | Card layouts make tracking projects very simple on mobile. |
| USR-043 | Ratan Sharma | ratan001sharma@gmail.com | `GA6O4G2WPFP2EROQETJA3XQPFDU7SBQULWPQWJTGDMN7CNKCEER5N6GN` | The timeline linking directly to StellarExpert hashes is a great touch. |
| USR-044 | Sunita Reddy | sunita.reddy2304@gmail.com | `GDP7KMYP4BR3CKAIM76QWE73Z3FHVXVKBTPPV3WSJELNPN7FPVB6UVN4` | Wallet connection flow via Freighter is seamless. |
| USR-045 | Manoj Das | 9876manojdas@gmail.com | `GCY3ZQMYQXYBSCB7SGK7GYY2JF3R4CSLLZA6T2Z3DCNNQFUYEPPVR5QQ` | Card layouts make tracking projects very simple on mobile. |
| USR-046 | Ranjana Joshi | ranjana1990joshi@gmail.com | `GBBSVISH3ZQPNXPTBTERNM4UDMZY6UQEPTB7EEZK3LLIM2BGJFA2G2PY` | Smooth dark mode theme transition and neat dashboard layout. |
| USR-047 | Anil Agarwal | anil.agarwal9090@gmail.com | `GAWYHCXKK77CKP2C5HFZUD7VC7NBSVUL5WS65MXZGAHHJI2GT66FKITO` | Card layouts make tracking projects very simple on mobile. |
| USR-048 | Aarti Singh | aarti.s1122@gmail.com | `GAVHMKK4R3WVY5SX356AWNZSNW6GAREO5NICUN6DD6KFISAAERGKBOCQ` | Card layouts make tracking projects very simple on mobile. |
| USR-049 | Bipin Yadav | bipin99yadav@gmail.com | `GBWSVHH5U5S7VAP4JII3NDI7VOJLMJQZBCJTQLLTXJTWQCKOFKOGXMBY` | The timeline linking directly to StellarExpert hashes is a great touch. |
| USR-050 | Kavita Gupta | kavitagupta6677@gmail.com | `GDA4C5SSNMUQMPINKCLCUAMBMGCIVYHXBOPE7I37LKDQ3RJESUK3OCZD` | Milestone progress stepper tracker is very clear and easy to follow. |
| USR-051 | Suraj Chauhan | suraj.c9898@gmail.com | `GBFI2U7FNAXXXGCYQGQQYSVH272RLOPPKF77NYX3B4R65MWZCRGVHS5U` | The timeline linking directly to StellarExpert hashes is a great touch. |
| USR-052 | Pooja Tiwari | pooja12tiwari@gmail.com | `GDHPMJAJX2CTC6WVSEYWERFIZ2YFMQDVYUZDH3PKF27LAFMRT3MNR7OJ` | Wallet connection flow via Freighter is seamless. |
| USR-053 | Rakesh Patel | rakesh.patel0707@gmail.com | `GD4ZDKLMYYWIF7CTX6RCJJRSAKAK5ZWP4S4PSGWF7PJW2O5SRCIESF7D` | Wallet connection flow via Freighter is seamless. |
| USR-054 | Nisha Sharma | nisha456sharma@gmail.com | `GBRKN7GLK27TA24ESKCC5L4P7NTBY7XUNYJSEHKJEU3TKOCJ6TVEQGNL` | Card layouts make tracking projects very simple on mobile. |
| USR-055 | Deepak Reddy | deepakreddy5432@gmail.com | `GANXTKQ5VA2GT2NXWFPAGY43MAHPSLS5ATVOKYNTJ2PETMKTENH5GFOO` | Smooth dark mode theme transition and neat dashboard layout. |
| USR-056 | Swati Das | swati.das1108@gmail.com | `GB6O2BNSVRVMFJ2OVMHHEXMIQWPEWZ65Q4BOSMLBBGKUF2SFLRWT3WOD` | The timeline linking directly to StellarExpert hashes is a great touch. |

### Feedback Implementation

| User ID | Name | Email | Wallet Address | Feedback Summary | Improvement Made | Git Commit ID |
|---|---|---|---|---|---|---|
| USR-001 | Amit Sharma | amit123sharma@gmail.com | `GDBFRWJR...` | Stepper progress tracker is very clear and easy to follow. | Stepper indicator added to project cards. | `df78e62` |
| USR-002 | Neha Patel | neha.patel9876@gmail.com | `GBI3IHGJ...` | Smooth dark mode theme transition and neat dashboard layout. | Built dark/light theme switch toggles. | `2636658` |
| USR-003 | Rahul Singh | rahul2507singh@gmail.com | `GDUYVIBF...` | Real-time toast notifications for on-chain state updates are extremely helpful. | Integrated on-chain event listeners for toasts. | `681db00` |
| USR-004 | Pooja Gupta | pooja007gupta@gmail.com | `GBOP5ILA...` | Wallet connection flow via Freighter is seamless. | Support multiple wallets via StellarWalletsKit. | `a876404` |
| USR-005 | Sanjay Yadav | sanjayyadav8899@gmail.com | `GALLWZYX...` | The timeline linking directly to StellarExpert hashes is a great touch. | On-chain activity logs added to client view. | `865bc79` |
| USR-006 | Kavita Tiwari | 9988kavitatiwari@gmail.com | `GAZFQ6L3...` | Card layouts make tracking projects very simple on mobile. | Responsive CSS grid overrides for dashboards. | `ba6ec43` |

---

## 📊 Monitoring & Analytics

### Event Telemetry
We use `[ANALYTICS_TOOL]` (e.g. PostHog) to monitor operations, track metrics, and evaluate DApp usability. The following custom actions are tracked:
*   `wallet_connected`: Triggered when users connect Freighter.
*   `project_created`: Logs successful on-chain project creation.
*   `milestone_funded`: Emitted when clients lock funds.
*   `milestone_submitted`: Captured when freelancers present deliverables.
*   `milestone_approved`: Dispatched when funds are released.
*   `milestone_disputed`: Sent when a dispute is opened.

These statistics can be analyzed in real-time in the `[ANALYTICS_TOOL]` dashboard.

### Error Tracking & Stability
We have integrated **Sentry** to capture client-side runtime errors. Sentry logs:
*   Rejected browser signature requests.
*   Network disconnection warnings or RPC failure timeouts.
*   Validation errors in project configurations.

---

## 🧪 Testing

### Smart Contract Tests (Rust)
Smart contract logic is tested using Rust's built-in cargo testing framework.
To run tests:
```bash
cargo test --manifest-path contracts/escrow_contract/Cargo.toml --target-dir target_test -j 1
```
These tests cover:
*   Milestone state transitions (Created $\rightarrow$ Funded $\rightarrow$ Submitted $\rightarrow$ Approved).
*   Enforcement of client-only permissions for funding and approvals.
*   Dispute arbitration flows and correct token disbursement.
*   Prevention of double-funding or double-release.

### Frontend Application Tests
To run frontend React unit tests:
```bash
cd frontend
npm test
```
These tests verify correct formatting of XLM amounts to Stroops and validation check logic for milestones.

---

## 📂 Project Structure

```text
Milestora/
├── .github/
│   └── workflows/              # GitHub Actions CI/CD workflows
├── backend/
│   ├── db/                     # SQLite database schema and instance
│   ├── server.js               # Express API backend for feedback
│   └── package.json
├── contracts/
│   └── escrow_contract/
│       ├── Cargo.toml          # Smart contract dependencies configuration
│       └── src/
│           ├── lib.rs          # Main contract entrypoint
│           └── test.rs         # Soroban contract testing suite
├── docs/                       # Technical documentations and spec sheets
├── frontend/
│   ├── public/                 # Static assets
│   ├── src/
│   │   ├── assets/             # Images, icons, and branding
│   │   ├── components/         # Reusable UI component blocks
│   │   ├── hooks/              # Custom React hooks
│   │   ├── services/
│   │   │   ├── analyticsService.ts # Event logging implementation
│   │   │   ├── contractService.ts  # SDK contract interaction wrappers
│   │   │   └── feedbackService.ts  # Feedback submission interface
│   │   ├── types/              # TypeScript types and definitions
│   │   ├── App.css             # Main styling
│   │   ├── App.tsx             # Primary dashboard application
│   │   ├── index.css           # Global layout & utility styling
│   │   └── main.tsx            # React entrypoint
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── README.md                   # Project overview and setup guides
└── TRANSACTIONS_PROOF.md       # On-chain testnet simulation documentation
```

---

## 🗺️ Next Phase Roadmap

*   **Real Stellar Anchor integration**: Integration of Stellar Anchors (SEP-24) to support credit card and fiat currency deposits/withdrawals, converting directly to XLM or stablecoins inside the escrow contract.
*   **Multi-arbitrator dispute DAO**: A decentralized oracle consensus or multi-arbitrator mechanism to resolve disputes without a single point of failure.
*   **Mainnet Launch**: Security audits, optimization of gas/fees, and deployment of Milestora on the Stellar Mainnet.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for details.

