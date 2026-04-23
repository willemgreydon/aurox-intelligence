import { ProfileForm } from '../../../components/account/profile-form';
import { Card } from '../../../components/ui/card';
import { requireCurrentSession } from '../../../server/auth/session';

export default async function AccountProfilePage() {
  const auth = await requireCurrentSession('/account/profile');

  return (
    <div className="account-stack">
      <Card>
        <ProfileForm user={auth.user} />
      </Card>
    </div>
  );
}
