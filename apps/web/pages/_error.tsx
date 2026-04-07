import type { NextPageContext } from 'next';

interface ErrorProps {
  statusCode?: number;
}

export default function Error({ statusCode }: ErrorProps) {
  return (
    <div style={{ fontFamily: 'sans-serif', textAlign: 'center', padding: '4rem' }}>
      <h1 style={{ fontSize: '3rem', margin: '0 0 1rem' }}>{statusCode ?? 'Error'}</h1>
      <p style={{ color: '#666' }}>
        {statusCode === 404 ? 'Page not found' : 'An unexpected error occurred'}
      </p>
    </div>
  );
}

Error.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res?.statusCode ?? err?.statusCode ?? 404;
  return { statusCode };
};
