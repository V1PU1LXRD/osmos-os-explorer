/**
 * Sample system calls for the System Call Gateway.
 *
 * `stages` describes what happens at each stop of the journey:
 *   application (user mode) → gateway (trap) → kernel handler → resource → response
 * The gateway animation walks through exactly these five stages.
 */

export const SYSCALL_STAGES = [
  { id: 'app', label: 'Application', mode: 'user' },
  { id: 'gateway', label: 'Syscall Gateway', mode: 'boundary' },
  { id: 'kernel', label: 'Kernel Handler', mode: 'kernel' },
  { id: 'resource', label: 'Hardware / Resource', mode: 'kernel' },
  { id: 'response', label: 'Response', mode: 'user' }
];

export const SYSTEM_CALLS = [
  {
    id: 'open',
    name: 'open()',
    number: 2,
    request: 'open("/home/student/notes/scheduling.txt", O_RDONLY)',
    result: 'fd = 3',
    tint: '#3fbf6f',
    summary: 'Ask the kernel for a handle to a file so the program can read it later.',
    stages: {
      app: 'The program calls open() with a path. It cannot touch the disk itself.',
      gateway: 'The CPU executes a trap instruction and switches from ring 3 to ring 0.',
      kernel: 'The VFS layer walks the directory tree, checks permissions and finds the inode.',
      resource: 'The disk driver reads the inode and prepares the file for access.',
      response: 'The kernel returns a small integer file descriptor — never a raw disk address.'
    }
  },
  {
    id: 'read',
    name: 'read()',
    number: 0,
    request: 'read(fd = 3, buffer, 1024)',
    result: 'bytes = 1024',
    tint: '#7bd1ff',
    summary: 'Pull bytes from an open file into the program’s own memory.',
    stages: {
      app: 'The program passes a file descriptor and the address of its buffer.',
      gateway: 'The kernel validates that fd = 3 belongs to this process and is readable.',
      kernel: 'The file-system layer maps the offset to disk blocks and starts the transfer.',
      resource: 'The disk controller performs the read and raises an interrupt when finished.',
      response: 'The kernel copies the bytes into the user buffer and returns the byte count.'
    }
  },
  {
    id: 'write',
    name: 'write()',
    number: 1,
    request: 'write(fd = 1, "OSMOS ready\\n", 12)',
    result: 'bytes = 12',
    tint: '#f0b429',
    summary: 'Send bytes to a file, a pipe or a device such as the terminal.',
    stages: {
      app: 'The program supplies the data and a destination descriptor (1 = standard output).',
      gateway: 'The trap transfers control to the kernel with the arguments in registers.',
      kernel: 'The kernel checks access rights and copies the data out of user space.',
      resource: 'The terminal driver queues the characters for the display hardware.',
      response: 'The kernel reports how many bytes were actually written.'
    }
  },
  {
    id: 'createProcess',
    name: 'createProcess()',
    number: 57,
    request: 'createProcess("/bin/scheduler", args)',
    result: 'pid = 4821',
    tint: '#ff8a5c',
    summary: 'Ask the kernel to build an entire new process — fork + exec in one step.',
    stages: {
      app: 'The program requests a new process; it has no power to create one itself.',
      gateway: 'The trap enters the kernel with the executable path and argument list.',
      kernel: 'The kernel allocates a PCB, a page table and an address space for the child.',
      resource: 'The binary is loaded from disk into the new address space.',
      response: 'The parent receives the child’s PID; the child starts in the Ready queue.'
    }
  }
];

export const SYSCALL_BY_ID = SYSTEM_CALLS.reduce((map, call) => {
  map[call.id] = call;
  return map;
}, {});
