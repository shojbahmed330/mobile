import React from 'react';
import { GroupRole } from '../types';

interface GroupRoleBadgeProps {
  role: GroupRole;
}

const GroupRoleBadge: React.FC<GroupRoleBadgeProps> = ({ role }) => {
  const styles: Record<GroupRole, string> = {
    'Admin': 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
    'Moderator': 'bg-sky-500/20 text-sky-400 border border-sky-500/30',
    'Top Contributor': 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  };

  return (
    <span className={`ml-2 px-2 py-0.5 text-xs font-semibold rounded-full ${styles[role]}`}>
      {role}
    </span>
  );
};

export default GroupRoleBadge;
