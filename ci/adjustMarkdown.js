const headingsToRemove = [
    { heading: 'Table of Contents', depth: 1 }, 
    { heading: 'Testing', depth: 2 }
];

const removeSectionByHeading = async (markdown, headingToRemove, depth) => {
    const { unified } = await import('unified');
    const { visit } = await import('unist-util-visit');
    const { default: parse } = await import('remark-parse');
    const { default: stringify } = await import('remark-stringify');

    const tree = unified()
      .use(parse)
      .parse(markdown);
                  
    visit(tree, 'heading', (node, index, parent) => {
        if (node.depth === depth && node.children[0].value === headingToRemove) {              
            // Remove the section under the heading
          let nextNodeIndex = index + 1;
          while (nextNodeIndex < parent.children.length && parent.children[nextNodeIndex].type !== 'heading' && parent.children[nextNodeIndex].type !== 'root') {
            parent.children.splice(nextNodeIndex, 1);
          } 
          if (parent) {
            parent.children.splice(index, 1);
          }
        }
      });

      return unified()
        .use(stringify)
        .stringify(tree);
};

const adjustHeading = async(markdown) => {
    const { unified } = await import('unified');
    const { visit } = await import('unist-util-visit');
    const { default: parse } = await import('remark-parse');
    const { default: stringify } = await import('remark-stringify');

    const tree = unified()
    .use(parse)
    .parse(markdown);

    visit(tree, 'heading', (node) => {
        if (node.depth === 1) {
          // Change h1 to h2
          node.depth = 2;
        } else if (node.depth === 2) {
          // Change h2 to h3
          node.depth = 3;
        }
      });

    return unified()
      .use(stringify)
      .stringify(tree);
}

async function adjustMarkdown(text) {
    let updatedText = text;
    for (const heading of headingsToRemove) {
        updatedText = await removeSectionByHeading(updatedText, heading.heading, heading.depth)
    }

    updatedText = await adjustHeading(updatedText);

    return updatedText;
}

const fs = require('fs');

async function getReadmeForDocs() {
  const source = 'README.md';
  const destination = 'DOCS_README.md';

  const markdown = fs.readFileSync(source, 'utf8');
  const adjustedMarkdown = await adjustMarkdown(markdown);
  console.log('typeof markdown', typeof(adjustedMarkdown))

  fs.writeFile(destination, adjustedMarkdown, 'utf8', (err) => {
    if (err) {
      console.error('Error writing file:', err);
    } else {
      console.log(`Markdown content saved to ${destination}`);
    }
  });
}

getReadmeForDocs();
