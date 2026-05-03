import { useFinance } from "../hooks/useFinance";

const FinancePage = () => {
    const { transactions } = useFinance();

    return (
        <div>
            <h2>Tài chính</h2>

            {transactions.map((t) => (
                <div key={t.id} className="border p-2 mt-2">
                    {t.type} - {t.amount}
                </div>
            ))}
        </div>
    );
};

export default FinancePage;