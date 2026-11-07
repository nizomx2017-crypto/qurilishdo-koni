// Buyurtma qatorlari jadvali (User va Admin sahifalarida bir xil)
import { formatMoney, formatNumber } from '../../utils/format';

export default function OrderItems({ order }) {
  return (
    <div className="table-wrap">
      <table className="compact">
        <thead>
          <tr><th>Mahsulot</th><th className="right">Narx</th><th className="right">Miqdor</th><th className="right">Summa</th></tr>
        </thead>
        <tbody>
          {order.items.map((it) => (
            <tr key={it.id}>
              <td>{it.product_name}</td>
              <td className="right num">{formatMoney(it.unit_price)}</td>
              <td className="right num">{formatNumber(it.quantity)} {it.unit}</td>
              <td className="right num">{formatMoney(it.total_price)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr><td colSpan={3} className="right"><b>Jami</b></td><td className="right num"><b>{formatMoney(order.total_amount)}</b></td></tr>
        </tfoot>
      </table>
    </div>
  );
}
