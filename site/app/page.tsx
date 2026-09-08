import {ConsoleShell} from './components/console/ConsoleShell';
import {Overview} from './components/console/Overview';

export default function Home() {
  return (
    <ConsoleShell>
      <Overview />
    </ConsoleShell>
  );
}
