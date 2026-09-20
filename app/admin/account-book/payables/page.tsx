import AccountBookPage from "../shared";

export const metadata = { title: "Vendor payable" };
export const dynamic = "force-dynamic";

export default function PayablesPage() {
  return <AccountBookPage tab="payables" />;
}
