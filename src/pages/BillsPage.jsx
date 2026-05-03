import { useBills } from "../hooks/useBills";

const BillsPage = () => {
    const { bills } = useBills();

    return (
        <div>
            <h2>Hóa đơn</h2>

            {bills.map((b) => (
                <div key={b.id} className="border p-2 mt-2">
                    {b.room} - {b.amount}
                </div>
            ))}
        </div>
    );
};

export default BillsPage;