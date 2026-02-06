import type { NextPageContext } from 'next'

interface ErrorProps {
  statusCode?: number
  err?: Error
}

function Error({ statusCode, err }: ErrorProps) {
  const message = statusCode
    ? `An error ${statusCode} occurred on server`
    : err?.message ?? 'An error occurred on client'

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif', textAlign: 'center' }}>
      <h1>{statusCode ?? 'Error'}</h1>
      <p>{message}</p>
    </div>
  )
}

Error.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err?.statusCode ?? 404
  return { statusCode, err: err ?? undefined }
}

export default Error
