// src/pages/Online/SectionPage.jsx
import { useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import Layout from "../../layouts/Layout";
import Footer from "../../components/responder/Footer";
import courseContent from "../../data/courseContent"; // your existing data file
import { markViewed, getProgress } from "../../lib/progress";

const slugify = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

/**
 * Flatten a course's sections into one ordered list of
 * { slug, title, content, sectionType }. Supports both shapes used in
 * courseContent: an array of { title } or { general|helpful|training: [...] }.
 */
const flattenSections = (sections) => {
  if (Array.isArray(sections)) {
    return sections.map((s, index) => ({
      ...s,
      slug: s.slug || slugify(s.title) || String(index + 1),
      sectionType: "general",
    }));
  }
  if (sections && typeof sections === "object") {
    return ["general", "helpful", "training"].flatMap((type) =>
      (sections[type] || []).map((s, index) => ({
        ...s,
        slug: s.slug || slugify(s.title) || String(index + 1),
        sectionType: type,
      })),
    );
  }
  return [];
};

export default function SectionPage() {
  // Route: /responder/modules/:id/section/:sectionSlug
  const { id, sectionSlug } = useParams();
  const course = courseContent[id];

  const list = useMemo(() => flattenSections(course?.sections), [course]);
  const idx = list.findIndex((s) => s.slug === sectionSlug);
  const item = idx >= 0 ? list[idx] : null;
  const next = idx >= 0 ? list[idx + 1] : null;

  // Hooks must run before any early return.
  useEffect(() => {
    if (!course || !item) return;
    const grouped = list.reduce((acc, s) => {
      (acc[s.sectionType] ||= []).push(s);
      return acc;
    }, {});
    markViewed(id, item.sectionType, item.slug, grouped);
  }, [id, course, item, list]);

  if (!course)
    return (
      <Layout>
        <div className="p-6 text-red-500">Course not found.</div>
        <Footer />
      </Layout>
    );

  if (!item)
    return (
      <Layout>
        <div className="p-6 text-red-500">Section not found.</div>
        <Footer />
      </Layout>
    );

  const progress = getProgress(id);
  const nextLocked = next && next.sectionType !== item.sectionType && !progress?.unlocked?.[next.sectionType];

  return (
    <Layout>
      <div className="course-wrapper">
        <h1 className="course-title">{course.title}</h1>
        <p className="course-breadcrumb">
          <Link to={`/responder/modules/${id}`}>Back to course</Link>
        </p>

        <div className="course-card">
          <h2>{item.title}</h2>
          <div
            className="course-section-content"
            dangerouslySetInnerHTML={{
              __html: item.content || "<p>No content yet.</p>",
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 16,
          }}
        >
          <Link to={`/responder/modules/${id}`} className="btn btn-outline">
            Back
          </Link>

          {next && !nextLocked ? (
            <Link
              to={`/responder/modules/${id}/section/${next.slug}`}
              className="btn btn-primary"
            >
              Next
            </Link>
          ) : (
            <Link to={`/responder/modules/${id}`} className="btn btn-primary">
              Back to course overview
            </Link>
          )}
        </div>
      </div>
      <Footer />
    </Layout>
  );
}
