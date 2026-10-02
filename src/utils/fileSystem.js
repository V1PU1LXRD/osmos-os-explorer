/**
 * Pure operations on the virtual file-system tree.
 *
 * A node is  { name, type: 'dir'|'file', permissions, modified, children?, size? }
 * A path is  ['home', 'student', 'notes']          — no leading '/'
 * The tree root itself is named '/'.
 *
 * Every function returns a NEW tree; nothing is mutated, so React state
 * updates stay predictable and undo-friendly.
 */

const nowStamp = () => {
  const date = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

/**
 * Deterministic stand-in for a real file size. Deriving it from the full path
 * keeps the demo reproducible (the same name always creates the same size)
 * instead of reaching for Math.random.
 */
function sizeFor(dirPath, name) {
  let hash = 2166136261;
  for (const character of `${formatPath(dirPath, 'dir')}${name}`) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return 64 + (Math.abs(hash) % 4033); // 64 B … 4,096 B
}

/** Follow a path and return the node, or null when the path does not exist. */
export function getNode(tree, path) {
  let node = tree;
  for (const segment of path) {
    if (!node || node.type !== 'dir') return null;
    node = (node.children || []).find((child) => child.name === segment);
    if (!node) return null;
  }
  return node;
}

/** Absolute path string with a trailing slash for directories. */
export function formatPath(path, type = 'dir') {
  const joined = ['/', ...path].join('/').replace(/\/+/g, '/');
  return type === 'dir' ? `${joined.replace(/\/$/, '')}/` : joined;
}

/** Sort directories first, then files, case-insensitive. */
export function sortChildren(children = []) {
  return [...children].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
}

/** Create a file or directory inside `dirPath`. Returns { tree, ok, message }. */
export function createNode(tree, dirPath, name, type) {
  const cleanName = String(name || '').trim();
  if (!cleanName) return { tree, ok: false, message: 'Name is empty.' };
  if (cleanName.includes('/')) return { tree, ok: false, message: 'Names cannot contain "/". Use one level at a time.' };

  const parent = getNode(tree, dirPath);
  if (!parent || parent.type !== 'dir') return { tree, ok: false, message: 'The current folder no longer exists.' };
  if ((parent.children || []).some((child) => child.name === cleanName)) {
    return { tree, ok: false, message: `"${cleanName}" already exists in this folder.` };
  }

  const node =
    type === 'dir'
      ? { name: cleanName, type: 'dir', permissions: 'drwxr-xr-x', modified: nowStamp(), children: [] }
      : { name: cleanName, type: 'file', size: sizeFor(dirPath, cleanName), permissions: '-rw-r--r--', modified: nowStamp() };

  const next = insertAtPath(tree, dirPath, { ...parent, children: [...(parent.children || []), node] });
  return { tree: next, ok: true, message: `${type === 'dir' ? 'Directory' : 'File'} "${cleanName}" created.` };
}

/** Delete the item at `targetPath` (a path INCLUDING the item's own name). */
export function deleteNode(tree, targetPath) {
  if (!targetPath.length) return { tree, ok: false, message: 'The root directory cannot be deleted.' };

  const parentPath = targetPath.slice(0, -1);
  const name = targetPath[targetPath.length - 1];
  const parent = getNode(tree, parentPath);
  if (!parent || parent.type !== 'dir') return { tree, ok: false, message: 'Parent folder not found.' };

  const removed = (parent.children || []).find((child) => child.name === name);
  if (!removed) return { tree, ok: false, message: `"${name}" was already deleted.` };

  const next = insertAtPath(tree, parentPath, {
    ...parent,
    children: (parent.children || []).filter((child) => child.name !== name)
  });
  return { tree: next, ok: true, message: `"${name}" deleted. Its inode and blocks are reclaimed.` };
}

/** Move (rename) the item at `targetPath` into `destDirPath` with a new name. */
export function moveNode(tree, targetPath, destDirPath, newName) {
  const cleanName = String(newName || '').trim();
  if (!cleanName) return { tree, ok: false, message: 'Name is empty.' };
  if (cleanName.includes('/')) return { tree, ok: false, message: 'Names cannot contain "/".' };

  const node = getNode(tree, targetPath);
  if (!node) return { tree, ok: false, message: 'Item not found.' };

  const parentPath = targetPath.slice(0, -1);
  const oldName = targetPath[targetPath.length - 1];

  // Guard: refuse to move a folder into itself or its own subtree.
  const isInside = destDirPath.length >= targetPath.length &&
    targetPath.every((segment, index) => destDirPath[index] === segment);
  if (node.type === 'dir' && isInside) {
    return { tree, ok: false, message: 'A folder cannot be moved into itself.' };
  }

  const destination = getNode(tree, destDirPath);
  if (!destination || destination.type !== 'dir') return { tree, ok: false, message: 'Destination folder not found.' };
  if ((destination.children || []).some((child) => child.name === cleanName)) {
    return { tree, ok: false, message: `"${cleanName}" already exists in the destination.` };
  }

  const moved = { ...node, name: cleanName, modified: nowStamp() };

  let next = insertAtPath(tree, parentPath, {
    ...getNode(tree, parentPath),
    children: getNode(tree, parentPath).children.filter((child) => child.name !== oldName)
  });
  next = insertAtPath(next, destDirPath, {
    ...getNode(next, destDirPath),
    children: [...getNode(next, destDirPath).children, moved]
  });

  return { tree: next, ok: true, message: `"${oldName}" moved to ${formatPath(destDirPath)} as "${cleanName}".` };
}

/** Immutably replace the node at `dirPath` inside the tree. */
function insertAtPath(tree, dirPath, replacement) {
  if (!dirPath.length) return replacement;

  const [head, ...rest] = dirPath;
  return {
    ...tree,
    children: tree.children.map((child) =>
      child.name === head ? insertAtPath(child, rest, replacement) : child
    )
  };
}

/** Count files and bytes in a subtree — powers the status line. */
export function countTree(node) {
  if (!node) return { files: 0, directories: 0, bytes: 0 };
  if (node.type === 'file') return { files: 1, directories: 0, bytes: node.size || 0 };
  return (node.children || []).reduce(
    (total, child) => {
      const sub = countTree(child);
      return {
        files: total.files + sub.files,
        directories: total.directories + sub.directories + (child.type === 'dir' ? 1 : 0),
        bytes: total.bytes + sub.bytes
      };
    },
    { files: 0, directories: 0, bytes: 0 }
  );
}

/** Example "open" action — explains what opening means in a real OS. */
export function describeOpen(node, path) {
  if (node.type === 'dir') {
    return `open(${formatPath(path)}) — the kernel loads the directory listing; no permission beyond r is needed.`;
  }
  const canExecute = node.permissions && node.permissions.includes('x');
  return canExecute
    ? `exec ${formatPath(path, 'file')} — this file has the execute bit (x), so the kernel may load it as a program.`
    : `open(${formatPath(path, 'file')}, O_RDONLY) — the kernel checks the permission bits, then returns a file descriptor.`;
}
