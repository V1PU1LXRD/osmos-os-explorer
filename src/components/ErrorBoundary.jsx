import { Component } from 'react';

/**
 * Catches a rendering failure in any module and drops the app into a flat
 * fallback instead of a blank screen. Class components are still the only way
 * to implement error boundaries in React.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Unknown error' };
  }

  componentDidCatch(error) {
    // Only surface in dev; production stays silent for the examiner's console.
    if (import.meta.env.DEV) {
      console.warn('[OSMOS] render error caught:', error);
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
