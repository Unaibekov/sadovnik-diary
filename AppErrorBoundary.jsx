import { Component } from "react";
import { Text } from "react-native";
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";

export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("AppErrorBoundary", error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return (
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
          <Text style={{ color: "red", padding: 24 }}>
            {String(this.state.error?.message || this.state.error)}
          </Text>
        </SafeAreaProvider>
      );
    }

    return this.props.children;
  }
}
