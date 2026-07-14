import { useMemo, useState, type FormEvent } from 'react';
import { FiFileText, FiLink2, FiPlayCircle, FiPlusCircle, FiSearch, FiTrash2 } from 'react-icons/fi';
import { useCreateEducationResource, useDeleteEducationResource, useEducation } from '../../hooks/useApi';
import './admin.css';

const resourceOptions = ['ALL', 'ARTICLE', 'PDF', 'VIDEO', 'DOC', 'LINK'];
const initialForm = {
  title: '',
  description: '',
  level: 'Beginner',
  duration: '15 min',
  lessons: 1,
  category: '',
  resourceType: 'ARTICLE',
  resourceUrl: '',
  featured: false,
  author: '',
  tags: '',
};

export default function AdminContent() {
  const { data: courses = [], isLoading } = useEducation();
  const createResource = useCreateEducationResource();
  const deleteResource = useDeleteEducationResource();
  const [form, setForm] = useState(initialForm);
  const [submitted, setSubmitted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');

  const categories = useMemo(
    () => Array.from(new Set(courses.map((course) => course.category))).sort(),
    [courses]
  );

  const filteredResources = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return courses.filter((course) => {
      const matchesSearch =
        !normalizedSearch ||
        course.title.toLowerCase().includes(normalizedSearch) ||
        course.description.toLowerCase().includes(normalizedSearch) ||
        course.category.toLowerCase().includes(normalizedSearch) ||
        course.tags.some((tag) => tag.toLowerCase().includes(normalizedSearch));
      const matchesType = filterType === 'ALL' || course.resourceType === filterType;
      const matchesCategory = filterCategory === 'ALL' || course.category === filterCategory;
      const matchesFeatured = !featuredOnly || course.featured;
      return matchesSearch && matchesType && matchesCategory && matchesFeatured;
    });
  }, [courses, filterType, filterCategory, featuredOnly, searchTerm]);

  const featuredResources = useMemo(() => courses.filter((course) => course.featured), [courses]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createResource.mutate(
      {
        ...form,
        lessons: Number(form.lessons),
        tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      },
      {
        onSuccess: () => {
          setSubmitted(true);
          setForm(initialForm);
          setActionMessage('Resource created successfully.');
          setActionError('');
        },
        onError: () => {
          setActionError('Failed to save resource.');
          setActionMessage('');
        },
      }
    );
  };

  const handleDeleteResource = (id: string) => {
    setActionMessage('');
    setActionError('');
    deleteResource.mutate(id, {
      onSuccess: () => {
        setActionMessage('Resource deleted successfully.');
      },
      onError: () => {
        setActionError('Unable to delete resource.');
      },
    });
  };

  return (
    <div className="admin-section-card glass-card admin-content-manager">
      <div className="admin-card-title">Content Manager</div>
      <div className="admin-card-description">Publish educational resources that will instantly appear in the learner dashboard.</div>

      <div className="admin-content-grid">
        <form className="admin-editor-card" onSubmit={handleSubmit}>
          <div className="admin-editor-title">
            <FiPlusCircle /> Add a new resource
          </div>
          <div className="admin-input-grid">
            <label>
              Title
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Advanced Price Action" required />
            </label>
            <label>
              Category
              <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Risk Management" required />
            </label>
            <label>
              Author
              <input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} placeholder="e.g. Jane Doe" required />
            </label>
            <label>
              Level
              <select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
                <option value="All Levels">All Levels</option>
              </select>
            </label>
            <label>
              Duration
              <input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="e.g. 20 min" />
            </label>
            <label>
              Lessons
              <input type="number" min="1" value={form.lessons} onChange={(e) => setForm({ ...form, lessons: Number(e.target.value) })} />
            </label>
            <label>
              Resource type
              <select value={form.resourceType} onChange={(e) => setForm({ ...form, resourceType: e.target.value })} required>
                {resourceOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
          </div>

          <label>
            Description
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} placeholder="Describe what users will learn from this resource" required />
          </label>

          <label>
            Resource link
            <input value={form.resourceUrl} onChange={(e) => setForm({ ...form, resourceUrl: e.target.value })} placeholder="https://..." required />
          </label>

          <label>
            Tags
            <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="risk, psychology, education" />
          </label>

          <label className="checkbox-row">
            <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} />
            Highlight this resource on the learner dashboard
          </label>

          <div className="admin-actions-row">
            <button type="submit" className="primary-btn" disabled={createResource.isPending}>
              {createResource.isPending ? 'Saving...' : 'Save resource'}
            </button>
            <span className="admin-hint">Resources save instantly and appear in the Education page.</span>
          </div>
          {submitted && <p className="success-text">Resource saved successfully.</p>}
        </form>

        <div className="admin-preview-card">
          <div className="admin-editor-title">Current library</div>
          {isLoading ? (
            <div className="admin-empty-state">Loading resources...</div>
          ) : (
            <>
              <div className="admin-filter-row">
                <div className="search-input small">
                  <FiSearch />
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search resources..."
                  />
                </div>
                <div className="filter-controls small">
                  <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                    {resourceOptions.map((option) => (
                      <option key={option} value={option}>{option === 'ALL' ? 'All types' : option}</option>
                    ))}
                  </select>
                  <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                    <option value="ALL">All categories</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                  <label className="checkbox-row">
                    <input type="checkbox" checked={featuredOnly} onChange={(e) => setFeaturedOnly(e.target.checked)} />
                    Featured only
                  </label>
                </div>
              </div>

              <div className="admin-quick-stats">
                <div>
                  <strong>{courses.length}</strong>
                  <span>Total resources</span>
                </div>
                <div>
                  <strong>{featuredResources.length}</strong>
                  <span>Featured</span>
                </div>
              </div>

              <div className="admin-resource-list">
                {actionError && <div className="error-text">{actionError}</div>}
              {actionMessage && <div className="success-text">{actionMessage}</div>}
              {filteredResources.length === 0 ? (
                  <div className="admin-empty-state">No resources match your filters.</div>
                ) : (
                  filteredResources.map((course) => (
                    <div key={course.id} className="admin-resource-item">
                      <div className="resource-icon">
                        {course.resourceType === 'VIDEO' ? <FiPlayCircle /> : course.resourceType === 'PDF' ? <FiFileText /> : <FiLink2 />}
                      </div>
                      <div className="resource-details">
                        <strong>{course.title}</strong>
                        <p>{course.description}</p>
                        <span>{course.category} · {course.level}</span>
                        <div className="resource-meta">
                          <span>{course.resourceType}</span>
                          <span>{course.author}</span>
                          <span>{course.duration}</span>
                        </div>
                        {course.tags.length > 0 && (
                          <div className="course-tags">
                            {course.tags.map((tag) => (
                              <span key={tag} className="course-tag">{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        className="admin-action-btn delete"
                        disabled={deleteResource.isPending}
                        onClick={() => handleDeleteResource(course.id)}
                      >
                        <FiTrash2 /> Delete
                      </button>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
