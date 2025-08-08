import React from 'react';

export const UsersIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 19.128a9.38 9.38 0 002.625.372m-10.5-.372a9.369 9.369 0 01-3.423-.764M12 20.25c.352 0 .7.068 1.05.195m-.21-8.753A5.25 5.25 0 0116.5 9.75V9a5.25 5.25 0 00-5.25-5.25h-1.5a5.25 5.25 0 00-5.25 5.25v.75c0 1.566.62 3.024 1.664 4.062M12 17.25a3.375 3.375 0 002.625-1.032M12 17.25a3.375 3.375 0 01-2.625-1.032M12 17.25v3M7.5 14.25v-3.375c0-1.621.508-3.246 1.42-4.561M16.5 14.25v-3.375c0-1.621-.508-3.246-1.42-4.561"
    />
  </svg>
);
