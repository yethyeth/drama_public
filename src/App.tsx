import { BrowserRouter as Router } from "react-router-dom";
import AppRouter from "@/router";
import Layout from "@/components/Layout";

export default function App() {
  return (
    <Router>
      <Layout>
        <AppRouter />
      </Layout>
    </Router>
  );
}
