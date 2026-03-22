# VyaparAI Impact Model (ET AI Hackathon 2026)

This model provides a quantified estimate of the business impact. The core target is a mid-sized Indian MSME processing 500 invoices/month.

## Assumptions
*   **Average MSME volume**: 500 purchase invoices & 200 sales invoices per month.
*   **Overcharge/Fraud Rate**: ~3% of all invoices contain an overcharge >= 15%, or duplicate billing errors.
*   **Average Invoice Value**: ₹25,000.
*   **SLA Penalties/Late Payment Hits**: 2 SLA breaches or late payment penalties avoided per month due to cashflow forecasting.
*   **Manual Data Entry Time**: 5 minutes per invoice (data entry, verifying GST, sorting).
*   **Cost of Accounting Labor**: ₹250/hour.

## Quantified Impact

### 1. Cost Leakage Recovery (Fraud / Overcharges)
*   3% of 500 invoices = 15 problematic invoices/month.
*   Average loss prevented per problematic invoice (assuming 15% error on ₹25,000) = ₹3,750.
*   **Total Monthly Savings (Fraud Engine)**: 15 * ₹3.750 = **₹56,250 / month**.

### 2. Time Saved (Operational Efficiency)
*   Total invoices: 700/month.
*   Manual time: 700 * 5 mins = 3,500 mins = 58.3 hours.
*   VyaparAI automation: 700 * 30 seconds (reviewing flags only) = 5.8 hours.
*   Time saved: 52.5 hours.
*   **Total Monthly Savings (Labor)**: 52.5 hrs * ₹250/hr = **₹13,125 / month**.

### 3. Revenue Recovered (SLA & Cashflow Control)
*   2 SLA penalties avoided per month.
*   Average penalty/late fee = ₹5,000.
*   **Total Monthly Savings (Cashflow Agent)**: **₹10,000 / month**.

## Total Estimated Impact Per MSME
**₹79,375 saved per month** (~₹9.5 Lakhs annually) per MSME.

With VyaparAI's scalable architecture targeting just 1% of India's 90 million MSMEs (900,000 businesses), the macroeconomic impact on the Indian economy is over **₹85,000 Crores annually in recovered working capital and operational efficiency.**
