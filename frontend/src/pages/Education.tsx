import { useMemo, useState, type ComponentType } from 'react';
import {
  FiBookOpen,
  FiClock,
  FiFileText,
  FiLink,
  FiPlayCircle,
  FiTrendingUp,
  FiZap,
} from 'react-icons/fi';
import PageLoader from '../components/ui/PageLoader';
import { useEducation } from '../hooks/useApi';
import './pages.css';

const resourceLabels: Record<string, string> = {
  PDF: 'PDF guide',
  VIDEO: 'Video lesson',
  LINK: 'External resource',
  ARTICLE: 'Article',
  DOC: 'Document',
};

const resourceIcons: Record<string, ComponentType<{ size?: number }>> = {
  PDF: FiFileText,
  VIDEO: FiPlayCircle,
  LINK: FiLink,
  ARTICLE: FiBookOpen,
  DOC: FiFileText,
};

function ResourceIcon({ resourceType }: { resourceType: string }) {
  const Icon = resourceIcons[resourceType] ?? FiTrendingUp;
  return <Icon size={28} />;
}

const levelOptions = ['ALL', 'Beginner', 'Intermediate', 'Advanced', 'All Levels'];
const typeOptions = ['ALL', 'ARTICLE', 'PDF', 'VIDEO', 'DOC', 'LINK'];

export default function Education() {
  const { data: courses = [], isLoading } = useEducation();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterLevel, setFilterLevel] = useState('ALL');

  const filteredCourses = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return courses.filter((course) => {
      const matchesSearch =
        !normalizedSearch ||
        course.title.toLowerCase().includes(normalizedSearch) ||
        course.description.toLowerCase().includes(normalizedSearch) ||
        course.category.toLowerCase().includes(normalizedSearch) ||
        course.tags.some((tag) => tag.toLowerCase().includes(normalizedSearch));
      const matchesType = filterType === 'ALL' || course.resourceType === filterType;
      const matchesLevel = filterLevel === 'ALL' || course.level === filterLevel;
      return matchesSearch && matchesType && matchesLevel;
    });
  }, [courses, filterType, filterLevel, searchTerm]);

  const featuredCourses = useMemo(() => filteredCourses.filter((course) => course.featured), [filteredCourses]);
  const libraryCourses = useMemo(() => filteredCourses.filter((course) => !course.featured), [filteredCourses]);

  if (isLoading) return <PageLoader message="Loading learning resources..." />;

  return (
    <div className="page-container page-shell">
      <div className="page-content">
        <div className="content-header">
          <div>
            <h2>Learning Center</h2>
            <p>Explore practical market education, actionable guides, and premium resources curated for your growth.</p>
          </div>
          <div className="education-pill">{filteredCourses.length} resources available</div>
        </div>

        <div className="education-filter-row">
          <div className="search-input">
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search resources, categories, tags..."
            />
          </div>
          <div className="filter-controls">
            <select value={filterType} onChange={(event) => setFilterType(event.target.value)}>
              {typeOptions.map((type) => (
                <option key={type} value={type}>
                  {type === 'ALL' ? 'All resource types' : type}
                </option>
              ))}
            </select>
            <select value={filterLevel} onChange={(event) => setFilterLevel(event.target.value)}>
              {levelOptions.map((level) => (
                <option key={level} value={level}>
                  {level === 'ALL' ? 'All levels' : level}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="education-grid">
          <div className="learning-panel">
            {featuredCourses.length > 0 && (
              <section className="education-featured-card glass-card">
                <div className="education-featured-header">
                  <div>
                    <p className="eyebrow">Featured this week</p>
                    <h3>Build a stronger foundation</h3>
                  </div>
                  <div className="education-pill education-pill-strong">
                    <FiZap /> New content
                  </div>
                </div>
                <div className="courses-grid courses-grid-featured">
                  {featuredCourses.map((course) => (
                    <article key={course.id} className="course-card course-card-featured">
                      <div className="course-thumb">
                        <div className="course-thumb-icon">
                          <ResourceIcon resourceType={course.resourceType} />
                        </div>
                        <div className="course-thumb-badge">{resourceLabels[course.resourceType] ?? 'Resource'}</div>
                      </div>
                      <div className="course-body">
                        <div className="course-title">{course.title}</div>
                        <div className="course-meta">
                          <span>{course.level}</span>
                          <span>•</span>
                          <span>{course.duration}</span>
                          <span>•</span>
                          <span>{course.lessons} lessons</span>
                        </div>
                        <p className="course-desc">{course.description}</p>
                        <div className="course-footer">
                          <span className="course-category">{course.category}</span>
                          <a className="course-link" href={course.resourceUrl} target="_blank" rel="noreferrer">
                            Open resource <FiPlayCircle />
                          </a>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            <section className="education-library-card glass-card">
              <div className="education-section-title">
                <div>
                  <p className="eyebrow">Learning library</p>
                  <h3>Structured lessons for every stage</h3>
                </div>
              </div>
              <div className="courses-grid">
                {filteredCourses.length === 0 ? (
                  <div className="empty-state">No learning resources match your filters.</div>
                ) : (
                  libraryCourses.length > 0 ? libraryCourses : featuredCourses
                ).map((course) => (
                  <article key={course.id} className="course-card">
                    <div className="course-thumb course-thumb-compact">
                      <div className="course-thumb-icon">
                        <ResourceIcon resourceType={course.resourceType} />
                      </div>
                      <div className="course-thumb-badge">{resourceLabels[course.resourceType] ?? 'Resource'}</div>
                    </div>
                    <div className="course-body">
                      <div className="course-title">{course.title}</div>
                      <div className="course-meta">
                        <span><FiClock /> {course.duration}</span>
                        <span><FiBookOpen /> {course.lessons} lessons</span>
                      </div>
                      <p className="course-desc">{course.description}</p>
                      <div className="course-tags">
                        {course.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="course-tag">#{tag}</span>
                        ))}
                      </div>
                      <div className="course-footer">
                        <span className="course-author">By {course.author}</span>
                        <a className="course-link" href={course.resourceUrl} target="_blank" rel="noreferrer">
                          View <FiPlayCircle />
                        </a>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>

          <aside className="support-panel glass-card">
            <h3>Why this matters</h3>
            <p className="admin-section-description">
              The education hub is designed to help traders move from foundational concepts to confident execution with short, focused resources.
            </p>
            <div className="education-steps">
              <div className="education-step">
                <strong>1. Learn faster</strong>
                <span>Short lessons make it easy to build knowledge in daily sessions.</span>
              </div>
              <div className="education-step">
                <strong>2. Stay organized</strong>
                <span>Resources are grouped by category, level, and content type.</span>
              </div>
              <div className="education-step">
                <strong>3. Keep improving</strong>
                <span>New materials can be added by the admin whenever the library grows.</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
