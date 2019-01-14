# Complex styling for Aspen trees

Takes care of inheritance, negations and overriding, with absolute ease.

## So what is it?

View libraries which leverage `aspen-core` as model for rendering nested trees typically use virtualization/windowing for rendering the said nested trees as a flat structure.
Virtualization allows said libraries to limit how many DOM nodes are renderered in the page at any given time. With "nested trees" one might expect them to be rendered like this:

```html
<ul class="children">
    <li><span class="label">package.json</span></li>
    <li><span class="label">.gitignore</span></li>
    <li>
        <span class="label">src</span>
        <ul class="children">
            <li><span class="label">App.js</span></li>
            <li><span class="label">index.js</span></li>
        </ul>
    </li>
</ul>
```

However, they are rendered like this (efficiency, remember?):

```html
<div class="label">package.json</div>
<div class="label">.gitignore</div>
<div class="label">src</div>
<div class="label">App.js</div>
<div class="label">index.js</div>
```

And if you haven't noticed already, this hunt for perfomance increase comes at a price. That is, giving up CSS inheritance we all know and love :(

With that, you can no longer say, "ok, this node and *all* of its children (except a few), I want them with red foreground". Quite sad.

## But now you can 👏👏

...and you don't need to worry about keeping the inheritance up to date. If a child gets moved to another parent, or a new child is added. Inheritances and negations
are auto-managed once you declare them.

```typescript

// ...

// get the handle to the thing you want to apply some classnames (in future we'll also support glob patterns!)
const nodeModulesDir = await treeModel.root.forceLoadFileEntryAtPath('/path/to/node_modules')

// create a Decoration with 'gitignore' classname (you can add extra classnames to one Decoration)
const gitIgnoreDeco = new Decoration('gitignore')

// register the decoration
decorationManager.addDecoration(gitIgnoreDeco)

// target the thing and all of its children
gitIgnoreDeco.addTarget(nodeModulesDir, TargetMatchMode.SelfAndChildren)

// you can skip some children using `Decoration#negateTarget(file)` or `Decoration#negateTarget(dir, TargetMatchMode.SelfAndChildren)`

// ...
```

## Usage

```bash
npm i aspen-decorations
```

> `aspen-core` is a peer dependency that you must install yourself

Once installed, here's one of the many ways you can consume this service:

> This example assumes you're using this package with `react-aspen` (Other ports shouldn't be much different)

```tsx
import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { DecorationManager } from 'aspen-decorations'
import { FileTree, TreeModel } from 'react-aspen'

class TreeModelX extends TreeModel {
    private decorations: DecorationManager
    constructor(host: IBasicFileSystemHost, rootPath: string) {
        super(host, rootPath)
        this.decorations = new DecorationManager(this.root)
    }
}

class FileTreeItem extends React.Component {
    render() {
        console.log(this.props.decorations.classlist) // > ['active', 'stuff', 'calculated']
        // ...
    }

    componentDidMount() {
        if (this.props.decorations) {
            this.props.decorations.addChangeListener(this.forceUpdate)
        }
    }

    componentWillUnmount() {
        if (this.props.decorations) {
            this.props.decorations.removeChangeListener(this.forceUpdate)
        }
    }

    componentDidUpdate(prevProps: IItemRendererXProps) {
        if (prevProps.decorations) {
            prevProps.decorations.removeChangeListener(this.forceUpdate)
        }
        if (this.props.decorations) {
            this.props.decorations.addChangeListener(this.forceUpdate)
        }
    }
}

class MySweetFileTree extends React.Component {
    render() {
        const { width, height, model } = this.props
        return (
            <FileTree
                width={width}
                height={height}
                model={model}
                itemHeight={24}>
                {({item, itemType}) => <FileTreeItem item={item} itemType={itemType} decorations={model.decorations.getDecorations(item)} />}
            </FileTreee>)
    }
}

const host: IBasicFileSystemHost = { pathStyle: 'unix', getItems: async (path) => { /* impl */ }}
const treeModelX: TreeModelX = new TreeModelX(host, '/')

ReactDOM.render(<MySweetFileTree width={400} height={700} model={treeModelX}/>, document.getElementById('app'))
```

## API

You can explore the full API [here](https://neeksandhu.github.io/aspen-decorations). However the rundown below should be more than enough for you to exploit
everything this package has to offer.

If you are good at CSS and know how to tame it, `aspen-decorations` will be no different. Here's how:

```typescript

const activeDeco = new Decoration('active')

// CSS equivalent: `.file-entry.active > .file-label { ... }`
activeDeco.addTarget(srcH, TargetMatchMode.Self)

// CSS equivalent: `.file-entry.active * { ... }`
activeDeco.addTarget(srcH, TargetMatchMode.SelfAndChildren)

// CSS equivalent: not very sure how to express these but imagine adding `:not(<selector>)` to above examples
activeDeco.negateTarget(subDirOfSrcH, TargetMatchMode.Self)
activeDeco.negateTarget(subDirOfSrcH, TargetMatchMode.SelfAndChildren)
```

That's pretty much it. Just remeber these rules:

 - `Decoration.addTarget(<dir>, TargetMatchMode.Self)` won't neccessarily "shield" it's children from having that decoration. Use negations to be 100% certain.
 - Rule defined on nearest parent (or itself) will override anything and everything previously defined. That is, inheritances and negations in effect by a parent higher up.
 - A target that is being shadowed by a negation set by one of its parent, can override and reacquire that `Decoration` by adding itself (and/or its children) as a target. 

## License

This project is licensed under MIT license. You are free to use, modify, distribute the code as you like (credits although not required, are highly appreciated)
