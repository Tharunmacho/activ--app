/**
 * District admin — the block admins of their district.
 *
 * Same screen the state tier uses, narrowed by the server: the listing returns
 * only block admins inside this district, the role dropdown offers only Block
 * Admin, and the state and district boxes are fixed to their own.
 */
import ManageAdminsScreen from '@/features/admin/components/ManageAdminsScreen';

const ManageAdmins = () => <ManageAdminsScreen tier="district" />;

export default ManageAdmins;
