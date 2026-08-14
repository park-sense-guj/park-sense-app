import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  children: ReactNode;
};

type State = {
  error: Error | null;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ParkSense UI error', error, info.componentStack);
  }

  private retry = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <View style={styles.root} accessibilityRole="alert">
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.body}>
          ParkSense hit an unexpected error. You can try again without losing your account session.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Try again"
          onPress={this.retry}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    backgroundColor: '#F4F7F5',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#14201A',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  body: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: '#5C6B63',
    textAlign: 'center',
    maxWidth: 320,
  },
  button: {
    marginTop: 22,
    minHeight: 48,
    paddingHorizontal: 22,
    borderRadius: 14,
    backgroundColor: '#1FA97A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
});
