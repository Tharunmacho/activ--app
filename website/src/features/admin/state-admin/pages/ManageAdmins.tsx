/**
 * State admin — the district and block admins of their state.
 *
 * One level wider than the district tier's: district admins and block admins
 * inside this state, and every account created here lands in it whatever the
 * form is asked for.
 */
import ManageAdminsScreen from '@/features/admin/components/ManageAdminsScreen';

const ManageAdmins = () => <ManageAdminsScreen tier="state" />;

export default ManageAdmins;
