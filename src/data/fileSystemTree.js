/**
 * The initial virtual file system shown in the File System Vault.
 * It mirrors the tree from the project brief.
 *
 * type        'dir' | 'file'
 * size        bytes (files only) — used to make the explorer feel real
 * permissions UNIX-style string, always 10 characters
 */
export const INITIAL_FILE_SYSTEM = {
  name: '/',
  type: 'dir',
  permissions: 'drwxr-xr-x',
  modified: '2026-01-04 09:12',
  children: [
    {
      name: 'home',
      type: 'dir',
      permissions: 'drwxr-xr-x',
      modified: '2026-01-04 09:12',
      children: [
        {
          name: 'student',
          type: 'dir',
          permissions: 'drwxr-xr-x',
          modified: '2026-02-11 18:40',
          children: [
            {
              name: 'projects',
              type: 'dir',
              permissions: 'drwxr-xr-x',
              modified: '2026-02-11 18:42',
              children: [
                {
                  name: 'osmos',
                  type: 'dir',
                  permissions: 'drwxr-xr-x',
                  modified: '2026-02-12 07:05',
                  children: [
                    { name: 'README.md', type: 'file', size: 8421, permissions: '-rw-r--r--', modified: '2026-02-12 07:05' },
                    { name: 'index.html', type: 'file', size: 1204, permissions: '-rw-r--r--', modified: '2026-02-12 06:58' }
                  ]
                }
              ]
            },
            {
              name: 'notes',
              type: 'dir',
              permissions: 'drwxr-xr-x',
              modified: '2026-01-29 21:14',
              children: [
                { name: 'scheduling.txt', type: 'file', size: 3120, permissions: '-rw-r--r--', modified: '2026-01-29 21:14' },
                { name: 'deadlock.txt', type: 'file', size: 2745, permissions: '-rw-r--r--', modified: '2026-01-30 08:02' }
              ]
            },
            { name: 'profile.cfg', type: 'file', size: 412, permissions: '-rw-r--r--', modified: '2026-01-12 11:30' }
          ]
        }
      ]
    },
    {
      name: 'etc',
      type: 'dir',
      permissions: 'drwxr-xr-x',
      modified: '2026-01-02 10:00',
      children: [
        { name: 'osmos.conf', type: 'file', size: 986, permissions: '-rw-r--r--', modified: '2026-01-02 10:00' },
        { name: 'hosts', type: 'file', size: 128, permissions: '-rw-r--r--', modified: '2026-01-02 10:00' }
      ]
    },
    {
      name: 'var',
      type: 'dir',
      permissions: 'drwxr-xr-x',
      modified: '2026-01-03 12:22',
      children: [
        {
          name: 'log',
          type: 'dir',
          permissions: 'drwxr-xr-x',
          modified: '2026-02-12 07:05',
          children: [
            { name: 'kernel.log', type: 'file', size: 15488, permissions: '-rw-r-----', modified: '2026-02-12 07:05' }
          ]
        }
      ]
    },
    {
      name: 'bin',
      type: 'dir',
      permissions: 'drwxr-xr-x',
      modified: '2026-01-02 09:59',
      children: [
        { name: 'scheduler', type: 'file', size: 65536, permissions: '-rwxr-xr-x', modified: '2026-01-02 09:59' },
        { name: 'memcheck', type: 'file', size: 32768, permissions: '-rwxr-xr-x', modified: '2026-01-02 09:59' }
      ]
    }
  ]
};

export const PERMISSION_HELP = [
  { pattern: 'd', meaning: 'File type: d = directory, - = regular file' },
  { pattern: 'rwx', meaning: 'Owner: read, write, execute (4 + 2 + 1)' },
  { pattern: 'r-x', meaning: 'Group: read and execute, but not write' },
  { pattern: 'r-x', meaning: 'Others: same as group here' }
];

export const STORAGE_KEY = 'osmos.filesystem.v1';
