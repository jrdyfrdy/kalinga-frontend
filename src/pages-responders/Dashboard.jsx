import Layout from "../layouts/Layout";
import DateRow from "../components/responder/DateRow";
import HealthRespondersCard from "../components/responder/HealthRespondersCard";
import HospitalPatientChart from "../components/responder/HospitalPatientChart";
import Reports from "../components/responder/Reports";
import MapCard from "../components/responder/MapCard";
import ResourcesCard from "../components/responder/ResourcesCard";
import TriageCard from "../components/responder/TriageCard";
import { Page } from "@/components/ui";

const Dashboard = () => (
  <Layout>
    <Page width="wide">
      <DateRow />
      <div className="grid gap-6 lg:grid-cols-2">
        <HealthRespondersCard />
        <HospitalPatientChart />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Reports />
        <MapCard />
      </div>
      <TriageCard />
      <ResourcesCard />
    </Page>
  </Layout>
);

export default Dashboard;
