import { PageHeader } from '../../components/navigation/PageHeader';
import { LocationTracker } from '../../components/location/LocationTracker';

export function CaregiverLocationPage() {
  return (
    <div className="page page--wide">
      <PageHeader
        title="Location Tracker"
        subtitle="Track the real-time location of your connected cared persons."
      />
      <LocationTracker />
    </div>
  );
}
