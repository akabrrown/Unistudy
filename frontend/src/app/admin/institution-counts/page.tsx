import { fetchUPSAFacultyDemographicsAction } from './actions';
import InstitutionCountsClient from './InstitutionCountsClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'UPSA Faculties & Demographics | UniStudy Admin',
  description: 'Manage UPSA academic faculties, degree programmes, and student enrollment distribution'
};

export default async function InstitutionCountsPage() {
  const { data } = await fetchUPSAFacultyDemographicsAction();

  return <InstitutionCountsClient initialData={data} />;
}
