import { fetchInstitutionCountsAction } from './actions';
import InstitutionCountsClient from './InstitutionCountsClient';

export const dynamic = 'force-dynamic';

export default async function InstitutionCountsPage() {
  const { data } = await fetchInstitutionCountsAction();

  return <InstitutionCountsClient initialInstitutions={data || []} />;
}
