import './loader.css';

export default function PageLoader({ message = 'Loading BrightTrade...' }: { message?: string }) {
  return (
    <div className="page-loader" role="status" aria-label="Loading">
      <div className="loader-spinner" />
      <p>{message}</p>
    </div>
  );
}
