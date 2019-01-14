import { Directory, FileEntry } from 'aspen-core'
import { IDisposable, Notificar } from 'notificar'
import { DecorationEvent, TargetMatchMode } from './types'

export class Decoration {
	/**
	 * Do not mutate directly, use `Decoration#addCSSClass()` / `Decoration#removeCSSClass` instead
	 */
	public readonly cssClasslist: Set<string>

	private _appliedTargetsDisposables: WeakMap<FileEntry | Directory, IDisposable> = new WeakMap()
	private _negatedTargetsDisposables: WeakMap<FileEntry | Directory, IDisposable> = new WeakMap()

	private _appliedTargets: Map<FileEntry | Directory, TargetMatchMode> = new Map()
	private _negatedTargets: Map<FileEntry | Directory, TargetMatchMode> = new Map()
	private _disabled = false

	private events = new Notificar<DecorationEvent>()

	constructor()
	constructor(...cssClasslist: string[])
	constructor(...cssClasslist: string[]) {
		if (Array.isArray(cssClasslist)) {
			if (cssClasslist.every((classname) => typeof classname === 'string')) {
				this.cssClasslist = new Set(cssClasslist)
			} else {
				throw new TypeError('classlist must be of type `Array<string>`')
			}
		} else {
			this.cssClasslist = new Set()
		}
	}

	get disabled() {
		return this._disabled
	}

	set disabled(disabled: boolean) {
		this._disabled = disabled
		this.events.dispatch(disabled ? DecorationEvent.DecorationDisabled : DecorationEvent.DecorationEnabled, this)
	}

	get appliedTargets() {
		return this._appliedTargets
	}

	get negatedTargets() {
		return this._negatedTargets
	}

	public addCSSClass(classname: string): void {
		if (this.cssClasslist.has(classname)) { return }
		this.cssClasslist.add(classname)
		this.events.dispatch(DecorationEvent.AddCSSClassname, this, classname)
	}

	public removeCSSClass(classname: string): void {
		if (!this.cssClasslist.has(classname)) { return }
		this.cssClasslist.delete(classname)
		this.events.dispatch(DecorationEvent.RemoveCSSClassname, this, classname)
	}

	public addTarget(directory: Directory, flags: TargetMatchMode): void
	public addTarget(file: FileEntry): void
	public addTarget(target: FileEntry | Directory, flags: TargetMatchMode = TargetMatchMode.Self): void {
		const existingFlags = this._appliedTargets.get(target)
		if (existingFlags === flags) { return }
		if (!(target instanceof FileEntry)) { return }
		this._appliedTargets.set(target, flags)
		this.events.dispatch(DecorationEvent.AddTarget, this, target, flags)
		this._appliedTargetsDisposables.set(target, target.root.onOnceDisposed(target, () => this.removeTarget(target)))
	}

	public removeTarget(directory: Directory): void
	public removeTarget(file: FileEntry): void
	public removeTarget(target: FileEntry | Directory): void {
		if (this._appliedTargets.delete(target)) {
			const disposable = this._appliedTargetsDisposables.get(target)
			if (disposable) {
				disposable.dispose()
			}
			this.events.dispatch(DecorationEvent.RemoveTarget, this, target)
		}
	}

	public negateTarget(directory: Directory, flags: TargetMatchMode): void
	public negateTarget(file: FileEntry): void
	public negateTarget(target: FileEntry | Directory, flags: TargetMatchMode = TargetMatchMode.Self): void {
		const existingFlags = this._negatedTargets.get(target)
		if (existingFlags === flags) { return }
		if (!(target instanceof FileEntry)) { return }
		this._negatedTargets.set(target, flags)
		this.events.dispatch(DecorationEvent.NegateTarget, this, target, flags)
		this._negatedTargetsDisposables.set(target, target.root.onOnceDisposed(target, () => this.unNegateTarget(target)))
	}

	public unNegateTarget(directory: Directory): void
	public unNegateTarget(file: FileEntry): void
	public unNegateTarget(target: FileEntry | Directory): void {
		if (this._negatedTargets.delete(target)) {
			const disposable = this._negatedTargetsDisposables.get(target)
			if (disposable) {
				disposable.dispose()
			}
			this.events.dispatch(DecorationEvent.UnNegateTarget, this, target)
		}
	}

	public onDidAddTarget(callback: (decoration: Decoration, target: FileEntry | Directory, flags: TargetMatchMode) => void): IDisposable {
		return this.events.add(DecorationEvent.AddTarget, callback)
	}

	public onDidRemoveTarget(callback: (decoration: Decoration, target: FileEntry | Directory) => void): IDisposable {
		return this.events.add(DecorationEvent.RemoveTarget, callback)
	}

	public onDidNegateTarget(callback: (decoration: Decoration, target: FileEntry | Directory, flags: TargetMatchMode) => void): IDisposable {
		return this.events.add(DecorationEvent.NegateTarget, callback)
	}

	public onDidUnNegateTarget(callback: (decoration: Decoration, target: FileEntry | Directory) => void): IDisposable {
		return this.events.add(DecorationEvent.UnNegateTarget, callback)
	}

	public onDidRemoveCSSClassname(callback: (decoration: Decoration, classname: string) => void): IDisposable {
		return this.events.add(DecorationEvent.RemoveCSSClassname, callback)
	}

	public onDidAddCSSClassname(callback: (decoration: Decoration, classname: string) => void): IDisposable {
		return this.events.add(DecorationEvent.AddCSSClassname, callback)
	}

	public onDidEnableDecoration(callback: (decoration: Decoration) => void): IDisposable {
		return this.events.add(DecorationEvent.DecorationEnabled, callback)
	}

	public onDidDisableDecoration(callback: (decoration: Decoration) => void): IDisposable {
		return this.events.add(DecorationEvent.DecorationDisabled, callback)
	}
}
