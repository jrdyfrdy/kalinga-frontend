// src/pages/Online/Certifications.jsx
import React, { useEffect, useState } from "react";
import nodeApi from "../../services/nodeApi";
import Layout from "../../layouts/Layout";
import Footer from "../../components/responder/Footer";
import "../../styles/personnel-style.css";
import {
  FaDownload,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
} from "react-icons/fa";

const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};

// Earned certificates (Node GET /training/certifications) and completed
// courses (GET /training/progress) for the signed-in responder.
const Certifications = () => {
  const [certifications, setCertifications] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      nodeApi.get("/training/certifications"),
      nodeApi.get("/training/progress"),
    ]).then(([certRes, progressRes]) => {
      if (cancelled) return;
      if (certRes.status === "fulfilled") setCertifications(certRes.value?.data?.data || []);
      if (progressRes.status === "fulfilled") {
        setCompleted((progressRes.value?.data?.data || []).filter((r) => r.status === "completed" || r.completed_at));
      }
      if (certRes.status === "rejected" && progressRes.status === "rejected") {
        setError("Unable to load your training records right now.");
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const certByCourse = Object.fromEntries(certifications.map((c) => [c.course_id, c]));
  const now = Date.now();

  return (
    <Layout>
      <div className="content">
        <h1 className="page-title">Certifications</h1>
        {error && <p className="subtitle">{error}</p>}

        <div className="section">
          <h3>Earned Certifications</h3>
          {loading ? (
            <p className="subtitle">Loading…</p>
          ) : certifications.length === 0 ? (
            <p className="subtitle">No certifications yet. Complete a training module to earn one.</p>
          ) : (
            <div className="card-list">
              {certifications.map((cert) => {
                const expired = cert.expires_at && new Date(cert.expires_at).getTime() < now;
                return (
                  <div className="gray-card" key={cert.id}>
                    <p className="title">{cert.course_title}</p>
                    <p className="subtitle">
                      Issued {formatDate(cert.issued_at)}
                      {cert.expires_at ? ` · Expires ${formatDate(cert.expires_at)}` : ""}
                    </p>
                    <span className={`status ${expired ? "expired" : "active"}`}>
                      {expired ? <FaTimesCircle /> : <FaCheckCircle />} {expired ? "Expired" : "Active"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="section">
          <h3>Completed Courses</h3>
          <table className="cert-table">
            <thead>
              <tr>
                <th style={{ width: "50%" }}>Course</th>
                <th style={{ width: "25%" }}>Date Completed</th>
                <th style={{ width: "25%" }}>Certificate</th>
              </tr>
            </thead>
            <tbody>
              {!loading && completed.length === 0 && (
                <tr>
                  <td colSpan={3}>No completed courses yet.</td>
                </tr>
              )}
              {completed.map((record) => {
                const cert = certByCourse[record.course_id];
                return (
                  <tr key={record.id}>
                    <td>{record.course_title}</td>
                    <td>{formatDate(record.completed_at)}</td>
                    <td>
                      {cert?.certificate_url ? (
                        <a className="btn-download" href={cert.certificate_url} target="_blank" rel="noreferrer">
                          <FaDownload /> Download
                        </a>
                      ) : (
                        <span className="subtitle">
                          <FaClock /> Not issued
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <Footer />
    </Layout>
  );
};

export default Certifications;
