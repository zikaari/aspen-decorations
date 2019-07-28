import { Directory, FileType, IBasicFileSystemHost, Root } from 'aspen-core'
import { ClasslistComposite, Decoration, DecorationsManager, TargetMatchMode } from '../src'

const sampleTree = {
    app: {
        tests: {
            'index.ts': '',
        },
        src: {
            components: {
                Header: {
                    'index.ts': '',
                    'styles.sass': '',
                },
            },
            models: {
                user: {
                    'index.ts': '',
                },
            },
        },
        scripts: {
            build: {
                'prod.ts': '',
                'dev.sass': '',
            },
        },
    },
    statics: {
        'image.png': '',
    },
}

function findNode(path: string[], tree) {
    if (!path || path.length === 0) {
        return tree
    }
    const next = path.shift()
    return findNode(path, tree[next])
}

const host: IBasicFileSystemHost = {
    pathStyle: 'unix',
    getItems(path) {
        const node = findNode(path.match(/[^\/]+/g), sampleTree)
        return Object.keys(node).map((fname) => ({
            name: fname,
            type: typeof node[fname] === 'string' ? FileType.File : FileType.Directory,
        }))
    },
}

let root: Root
const fileHandles = {
    '/app': null,
    '/app/tests': null,
    '/app/tests/index.ts': null,
    '/app/src': null,
    '/app/src/models': null,
    '/app/src/components': null,
    '/app/src/components/Header': null,
    '/app/src/components/Header/styles.sass': null,
    '/app/scripts/build': null,
    '/app/scripts/build/prod.ts': null,
    '/statics': null,
    '/statics/image.png': null
}

describe('Fixtures', async () => {
    it('create a dummy TreeModel', () => { root = new Root(host, '/') })
    it('loads testable FileEntries', async () => {
        for (const path in fileHandles) {
            fileHandles[path] = await root.forceLoadFileEntryAtPath(path)
        }
    })
})

describe('Decoration engine', () => {
    let testDeco01: Decoration
    let testDeco02: Decoration
    let testDeco03: Decoration
    let decoManager: DecorationsManager
    it('create a new DecorationManager', () => { decoManager = new DecorationsManager(root) })

    it('DecorationManager returns ClasslistComposites even when no Decorations have been applied', () => {
        expect(decoManager.getDecorations(fileHandles['/app/src'])).toBeInstanceOf(ClasslistComposite)
        expect(decoManager.getDecorations(fileHandles['/app/src/models'])).toBeInstanceOf(ClasslistComposite)
        expect(decoManager.getDecorations(fileHandles['/app/src/models']).classlist).toBeInstanceOf(Array)
    })

    it('DecorationManager returns same ClasslistComposite reference everytime given the same target', () => {
        expect(decoManager.getDecorations(fileHandles['/app/src/models'])).toBe(decoManager.getDecorations(fileHandles['/app/src/models']))
    })

    it('ClasslistComposite#classlist for a target references its parent\'s ClasslistComposite#classlist when no decorations are applicable to save memory', () => {
        expect(decoManager.getDecorations(fileHandles['/app/src/models']).classlist).toBe(decoManager.getDecorations(fileHandles['/app/src']).classlist)
        expect(decoManager.getDecorations(fileHandles['/app/src']).classlist).toBe(decoManager.getDecorations(fileHandles['/app']).classlist)
    })

    it('DecorationComposite#decorations for a target references its parent\'s inheritable DecorationComposite#decorations when no decorations are applicable to save memory', () => {
        expect(decoManager.getDecorationData(fileHandles['/app/src/models']).applicable.renderedDecorations)
            .toBe(decoManager.getDecorationData(fileHandles['/app/src']).inheritable.renderedDecorations)
        expect(decoManager.getDecorationData(fileHandles['/app/src']).applicable.renderedDecorations)
            .toBe(decoManager.getDecorationData(fileHandles['/app']).inheritable.renderedDecorations)
    })

    it('create new Decoration with initial classnames and no targets (`testDeco01`)', () => { testDeco01 = new Decoration('active', 'blue') })

    it('registers Decoration `testDeco01`', () => { decoManager.addDecoration(testDeco01) })

    it('create new Decoration with no classname and initial targets (`testDeco02`) (preferably self)', async () => {
        testDeco02 = new Decoration()
        testDeco02.addTarget(fileHandles['/app/src'] as Directory, TargetMatchMode.Self)
        testDeco02.addTarget(fileHandles['/app/scripts/build'] as Directory, TargetMatchMode.Self)
    })

    it('registers Decoration `testDeco02`', () => { decoManager.addDecoration(testDeco02) })

    it('verify no target gets nothing applied due to one deco having no targets and another having no classnames', () => {
        expect(decoManager.getDecorations(fileHandles['/app/src']).classlist).toEqual(expect.arrayContaining([]))
        expect(decoManager.getDecorations(fileHandles['/app/src/models']).classlist).toEqual(expect.arrayContaining([]))
        expect(decoManager.getDecorations(fileHandles['/app/scripts/build']).classlist).toEqual(expect.arrayContaining([]))
    })

    it('adds classname to `testDeco02`', () => {
        testDeco02.addCSSClass('purple')
    })

    it('verify testDeco02 targets get the newly added classname', () => {
        const testDeco02Classlist = [...testDeco02.cssClasslist]
        expect(decoManager.getDecorations(fileHandles['/app/src']).classlist).toEqual(expect.arrayContaining(testDeco02Classlist))
        expect(decoManager.getDecorations(fileHandles['/app/scripts/build']).classlist).toEqual(expect.arrayContaining(testDeco02Classlist))
    })

    it('verify testDeco02 targeting did not affect other objects', () => {
        const testDeco02Classlist = [...testDeco02.cssClasslist]
        expect(decoManager.getDecorations(fileHandles['/app']).classlist).not.toEqual(expect.arrayContaining(testDeco02Classlist))
        expect(decoManager.getDecorations(fileHandles['/app/src/models']).classlist).not.toEqual(expect.arrayContaining(testDeco02Classlist))
    })

    it('add a target to `testDeco01` (target not mutual with `testDeco02`)', () => {
        testDeco01.addTarget(fileHandles['/app/src/models'])
    })

    it('verify testDeco01 targets get the testDeco01 classnames', () => {
        const testDeco01Classlist = [...testDeco01.cssClasslist]
        expect(decoManager.getDecorations(fileHandles['/app/src/models']).classlist).toEqual(expect.arrayContaining(testDeco01Classlist))
    })

    it('verify testDeco02 targets remain unaffected by change in testDeco01 target list', () => {
        const testDeco02Classlist = [...testDeco02.cssClasslist]
        const testDeco01Classlist = [...testDeco01.cssClasslist]
        expect(decoManager.getDecorations(fileHandles['/app/src']).classlist).toEqual(expect.arrayContaining(testDeco02Classlist))
        expect(decoManager.getDecorations(fileHandles['/app/scripts/build']).classlist).toEqual(expect.arrayContaining(testDeco02Classlist))
        expect(decoManager.getDecorations(fileHandles['/app/src']).classlist).not.toEqual(expect.arrayContaining(testDeco01Classlist))
        expect(decoManager.getDecorations(fileHandles['/app/scripts/build']).classlist).not.toEqual(expect.arrayContaining(testDeco01Classlist))
    })

    it('verify again testDeco02 and testDeco02 targeting did not affect other objects', () => {
        const testDeco0102Classlist = [...testDeco02.cssClasslist, ...testDeco01.cssClasslist]
        expect(decoManager.getDecorations(fileHandles['/app']).classlist).not.toEqual(expect.arrayContaining(testDeco0102Classlist))
        expect(decoManager.getDecorations(fileHandles['/app/scripts/build/prod.ts']).classlist).not.toEqual(expect.arrayContaining(testDeco0102Classlist))
    })

    it(`add a testDeco01's target to testDeco02's target list`, () => {
        testDeco02.addTarget(fileHandles['/app/src/models'])
    })

    it(`testDeco01's and testDeco02's mutual target get classnames from both the decorations`, () => {
        const testDeco0102Classlist = [...testDeco01.cssClasslist, ...testDeco02.cssClasslist]
        expect(decoManager.getDecorations(fileHandles['/app/src/models']).classlist).toEqual(expect.arrayContaining(testDeco0102Classlist))
    })

    it(`target testDeco02 at a directory and *all* of it children (target is parent of one of testDeco02's existing targets, which was directory and applied in Self mode)`, () => {
        testDeco02.addTarget(fileHandles['/app'] as Directory, TargetMatchMode.SelfAndChildren)
    })

    it(`newly added target applies to itself and all children of it's own first child`, () => {
        const testDeco02Classlist = [...testDeco02.cssClasslist]
        expect(decoManager.getDecorations(fileHandles['/app']).classlist).toEqual(expect.arrayContaining(testDeco02Classlist))
        expect(decoManager.getDecorations(fileHandles['/app/tests']).classlist).toEqual(expect.arrayContaining(testDeco02Classlist))
        expect(decoManager.getDecorations(fileHandles['/app/tests/index.ts']).classlist).toEqual(expect.arrayContaining(testDeco02Classlist))
    })

    it(`newly added target also affects children of previously applied targets which were directories meant to target just themselves`, () => {
        const testDeco02Classlist = [...testDeco02.cssClasslist]
        expect(decoManager.getDecorations(fileHandles['/app/src/components/Header']).classlist).toEqual(expect.arrayContaining(testDeco02Classlist))
        expect(decoManager.getDecorations(fileHandles['/app/src/components/Header/styles.sass']).classlist).toEqual(expect.arrayContaining(testDeco02Classlist))
    })

    it(`negates a target and its children from application of testDeco02 to prevent implicit inheritance (i.e serious 'Decoration#addTarget(fileOrDir, TargetMatchMode.Self)')`, () => {
        testDeco02.negateTarget(fileHandles['/app/src/components'], TargetMatchMode.SelfAndChildren)
    })

    it(`explicit negation prevents application of decoration to target and children`, () => {
        const testDeco02Classlist = [...testDeco02.cssClasslist]
        expect(decoManager.getDecorations(fileHandles['/app/src/components']).classlist).not.toEqual(expect.arrayContaining(testDeco02Classlist))
        expect(decoManager.getDecorations(fileHandles['/app/src/components/Header']).classlist).not.toEqual(expect.arrayContaining(testDeco02Classlist))
        expect(decoManager.getDecorations(fileHandles['/app/src/components/Header/styles.sass']).classlist).not.toEqual(expect.arrayContaining(testDeco02Classlist))
    })

    it(`when a Decoration hierarchy (target and children) is non-conflicting, all children reference their parent's data container to save memory`, () => {
        expect(decoManager.getDecorations(fileHandles['/app']).classlist)
            .toEqual(decoManager.getDecorations(fileHandles['/app/tests']).classlist)
        expect(decoManager.getDecorations(fileHandles['/app/tests']).classlist)
            .toEqual(decoManager.getDecorations(fileHandles['/app/tests/index.ts']).classlist)
    })

    it('create new Decoration with initial classnames and no targets (`testDeco03`)', () => { testDeco03 = new Decoration('green') })

    it('registers Decoration `testDeco03`', () => { decoManager.addDecoration(testDeco03) })

    it('add a target to `testDeco03`', () => {
        testDeco03.addTarget(fileHandles['/statics/image.png'], TargetMatchMode.Self)
    })

    it('verify testDeco03 targets get the testDeco03 classnames', () => {
        const testDeco03Classlist = [...testDeco03.cssClasslist]
        expect(decoManager.getDecorations(fileHandles['/statics/image.png']).classlist)
            .toEqual(expect.arrayContaining(testDeco03Classlist))
    })

    it('unregisters Decoration `testDeco03`', () => { decoManager.removeDecoration(testDeco03) })

    it(`verify unregister Decoration worked as expected by checking the classnames`, () => {
        const testDeco03Classlist = [...testDeco03.cssClasslist]
        expect(decoManager.getDecorations(fileHandles['/statics/image.png']))
            .not.toEqual(expect.arrayContaining(testDeco03Classlist))
    })
})
