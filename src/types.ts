export enum TargetMatchMode {
	None = 1,
	Self,
	Children,
	SelfAndChildren,
}

export enum DecorationEvent {
	DidUpdateResolvedDecorations = 1,
	AddCSSClassname,
	RemoveCSSClassname,
	ChangeCSSClasslist,
	AddTarget,
	RemoveTarget,
	NegateTarget,
	UnNegateTarget,
	DecorationEnabled,
	DecorationDisabled,
}
