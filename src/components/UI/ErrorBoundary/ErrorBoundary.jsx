import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack)
  }

  componentDidUpdate(prevProps) {
    // Clear the caught error when the reset key changes (e.g. the user navigates
    // to a different page), so a one-off render crash doesn't wedge the UI.
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null })
    }
  }

  render() {
    if (this.state.error) {
      return this.props.fallback ?? null
    }
    return this.props.children
  }
}
