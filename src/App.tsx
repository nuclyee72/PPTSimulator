import { SetupScreen } from './setup/SetupScreen';
import { Simulator } from './sim/Simulator';
import { useApp } from './store';

export function App() {
  const screen = useApp((s) => s.screen);
  return screen === 'setup' ? <SetupScreen /> : <Simulator />;
}
