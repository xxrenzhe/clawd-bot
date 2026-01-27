export type RootNode = {
  type: 'root';
  children?: Array<{
    type: string;
    depth?: number;
    [key: string]: unknown;
  }>;
};

export function remarkStripFirstHeading() {
  return (tree: RootNode) => {
    if (!Array.isArray(tree.children)) {
      return;
    }

    let removed = false;
    const nextChildren: NonNullable<RootNode['children']> = [];

    for (const node of tree.children) {
      if (node.type === 'heading' && node.depth === 1) {
        if (!removed) {
          removed = true;
          continue;
        }
        node.depth = 2;
      }
      nextChildren.push(node);
    }

    tree.children = nextChildren;
  };
}

export default remarkStripFirstHeading;
