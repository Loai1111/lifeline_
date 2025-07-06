import Layout from "@/components/Layout";
import HospitalSidebar from "@/components/HospitalSidebar";

function HospitalDashboardContent() {
  return (
    <div>
      <h1>Hospital Dashboard</h1>
      <p>If you can see this, the basic dashboard component is working.</p>
    </div>
  );
}

export default function HospitalDashboard() {
  return (
    <Layout sidebar={<HospitalSidebar />}>
      <HospitalDashboardContent />
    </Layout>
  );
}
