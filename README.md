# Personal Finance Dashboard & Projection App

A modern, comprehensive financial tracking and projection web application built with React, Vite, and Tailwind CSS. The platform enables users to monitor their financial status, plan budgets, scan receipts using AI, track investments, and project future net worth through detailed, interactive charts.

## 🚀 Features

-   **Dashboard:** Provides an overview of total assets, monthly income/expenses, and net capital growth.
-   **Future Projection:** Interactive chart capable of estimating net worth based on recurring and one-time income/expense streams over varying periods (1 month up to 5 years).
-   **AI Receipt Scanner:** Incorporates AI capabilities (powered by Gemini) to extract transaction details from receipt images.
-   **Budgeting:** Categorize expenses, allocate limits, and track remaining balances for the month.
-   **Transactions & Bills:** Maintain a structured ledger for day-to-day spending and manage recurring bills.
-   **Investments:** Monitor portfolio performance, asset allocation, and ROI.
-   **Supabase Authentication Integration:** Ready-to-use authentication wrapper with Supabase.

## 🛠️ Tech Stack

-   **Frontend Framework:** React 19 + Vite
-   **Styling:** Tailwind CSS (v4)
-   **Icons:** Lucide React
-   **Charts:** Recharts
-   **Routing:** React Router DOM
-   **Authentication:** Supabase Auth
-   **Date Formatting:** date-fns

## ⚙️ Getting Started

### Prerequisites

-   Node.js (v18 or higher recommended)
-   npm, yarn, or pnpm
-   Supabase Account (for auth)
-   Google Gemini API Key (for AI Receipt Scanning)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/yourusername/finance-dashboard.git
    cd finance-dashboard
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Variables:**
    Copy the sample environment file and fill in your keys:
    ```bash
    cp .env.example .env
    ```
    Open `.env` and add your specific keys:
    ```env
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```
    *(Note: Ensure you add any required keys for AI features if requested by your code).*

4.  **Run the development server:**
    ```bash
    npm run dev
    ```

    The application will be available at `http://localhost:3000`.

## 📦 Deployment

### Netlify Deployment

This project includes a `public/_redirects` file mapped to `/* /index.html 200` to support client-side routing on Netlify.

1.  Push your code to a GitHub/GitLab/Bitbucket repository.
2.  Connect your repository to Netlify.
3.  Set the **Build Command** to `npm run build`.
4.  Set the **Publish Directory** to `dist`.
5.  Add your `.env` variables into the Netlify Dashboard (Site Settings > Environment Variables).
6.  Deploy!

## 🤝 Contributing

Contributions, issues, and feature requests are welcome. Feel free to check the [issues page](#) if you want to contribute.

## 📃 License

This project is open-source and available under the [MIT License](LICENSE).
