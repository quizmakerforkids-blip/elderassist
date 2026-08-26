import { PageHeader } from '../../components/navigation/PageHeader';
import { PharmacyFinder } from '../../components/location/PharmacyFinder';

export function PharmacyPage() {
  return (
    <div className="page page--wide">
      <PageHeader
        title="Pharmacy Finder"
        subtitle="Find nearby pharmacies, hospitals, and clinics using your current location."
      />
      <PharmacyFinder />
    </div>
  );
}
