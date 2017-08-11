import { Autocomplete } from "@sourcegraph/components/src/Autocomplete";
import { Sourcegraph as AutocompleteStyles } from "@sourcegraph/components/src/Autocomplete/style";
import * as csstips from "csstips";
import * as React from "react";
import * as AddIcon from "react-icons/lib/md/add";
import * as CheckboxFilled from "react-icons/lib/md/check-box";
import * as CheckboxOutline from "react-icons/lib/md/check-box-outline-blank";
import * as SearchIcon from "react-icons/lib/md/search";
import * as Rx from "rxjs";
import { fetchRepos } from "sourcegraph/backend";
import { getSearchPath } from "sourcegraph/search";
import { setState as setSearchState, State as SearchState, store as searchStore } from "sourcegraph/search/store";
import { defaultSearchGroups, RepoResult, resolveRepos } from "sourcegraph/search/util";
import { inputBackgroundColor, normalFontColor, primaryBlue, referencesBackgroundColor, white } from "sourcegraph/util/colors";
import { parse } from "sourcegraph/util/url";
import { style } from "typestyle";

namespace Styles {
	const padding = "10px";
	const borderRadius = "2px";
	const rowHeight = "32px";
	const input = { backgroundColor: inputBackgroundColor, padding, border: "none", color: white, fontSize: "14px", $nest: { "&::placeholder": { color: normalFontColor }, "&:focus": { outline: "none" } } };

	export const icon = style({ fontSize: "18px", marginRight: "8px" });

	export const container = style(csstips.horizontal, csstips.center, { height: "120px", backgroundColor: referencesBackgroundColor, color: normalFontColor, padding: "8px 12px", fontSize: "13px" });

	export const repoArea = style(csstips.flex4, { marginLeft: "16px", maxWidth: "30%", height: "80px" });
	export const reposInput = style(input, { borderRadius, minHeight: "100%", width: "100%", maxHeight: "100%", minWidth: "100%", maxWidth: "100%" });

	export const addReposSection = style(csstips.flex3);
	export const addReposButton = style(csstips.horizontal, csstips.center, { backgroundColor: inputBackgroundColor, height: rowHeight, padding, cursor: "pointer", borderRadius });

	export const autocomplete = AutocompleteStyles.repoAutocomplete({
		results: style({ maxHeight: "48px" }),
	});

	export const filesSection = style(csstips.flex2, { marginLeft: "16px" });
	export const filesInput = style(input, { marginTop: "8px", borderRadius, height: rowHeight, width: "100%" });

	export const filtersSection = style(csstips.flex, csstips.vertical, { marginLeft: "16px" });
	export const filter = style(csstips.flex, csstips.horizontal, csstips.center, { cursor: "pointer", userSelect: "none" });

	export const searchButton = style(csstips.horizontal, csstips.center, csstips.content, {
		marginLeft: "8px",
		backgroundColor: primaryBlue,
		height: rowHeight,
		padding,
		borderRadius,
		color: `${white} !important`,
		textDecoration: "none",
	});

}

export class AdvancedSearchDrawer extends React.Component<{}, SearchState> {
	subscription: Rx.Subscription;

	constructor(props: {}) {
		super(props);
		// this.state = { ...searchStore.getValue(), showAutocomplete: true };
		this.state = searchStore.getValue();
	}

	componentDidMount(): void {
		this.subscription = searchStore.subscribe((state) => {
			this.setState(state as any);
		});

		const u = parse();
		if (u.uri) {
			setSearchState({ ...searchStore.getValue(), repos: u.uri! });
		}
	}

	componentWillUnmount(): void {
		if (this.subscription) {
			this.subscription.unsubscribe();
		}
	}

	componentDidUpdate(_: {}, prevState: SearchState): void {
		if (prevState.showAdvancedSearch !== this.state.showAdvancedSearch) {
			setSearchState({ ...searchStore.getValue(), showAutocomplete: Boolean(this.state.showAdvancedSearch) });
		}
	}

	onChange(query: string): void {
		query = query.toLowerCase();
		if (query === "" && this.refs.autocomplete) {
			(this.refs.autocomplete as any).setItems([{ uri: "active" }, { uri: "inactive" }]);
			return;
		}
		fetchRepos(query).then(repos => {
			if (this.refs.autocomplete) {
				(this.refs.autocomplete as any).setItems(repos);
			}
		});
	}

	onSelect(item: RepoResult): void {
		const current = this.state.repos.split(/,\s*/);
		let addition = ", " + item.uri;
		for (const uri of current) {
			if (uri === item.uri) {
				addition = "";
				break;
			}
		}
		setSearchState({ ...searchStore.getValue(), repos: this.state.repos + addition });
	}

	onUpdateRepos(value: string): void {
		setSearchState({ ...searchStore.getValue(), repos: value });
	}

	render(): JSX.Element | null {
		return <div className={Styles.container}>
			<div className={Styles.addReposSection}>
				{
					!this.state.showAutocomplete &&
					<div className={Styles.addReposButton} onClick={() => this.setState({ showAutocomplete: true })}>
						<AddIcon className={Styles.icon} />
						<span>Select repositories...</span>
					</div>
				}
				{
					this.state.showAutocomplete &&
					<Autocomplete classes={Styles.autocomplete}
						ItemView={RepoResult}
						initItems={defaultSearchGroups}
						getItems={(value) => resolveRepos(value)}
						onEscape={() => this.setState({ showAutocomplete: false })}
						onSelect={(item) => this.onSelect(item)} />
				}
			</div>
			<div className={Styles.repoArea}>
				<textarea className={Styles.reposInput} value={this.state.repos} onChange={(e) => {
					setSearchState({ ...searchStore.getValue(), repos: e.target.value });
				}} />
			</div>
			<div className={Styles.filesSection}>
				<div>Files to include:</div>
				<input className={Styles.filesInput} value={this.state.files} placeholder="example: *.go" onChange={(e) => {
					setSearchState({ ...searchStore.getValue(), files: e.target.value });
				}} />
			</div>
			<div className={Styles.filtersSection}>
				<span style={{ marginBottom: "8px" }}>Match:</span>
				{
					[{ key: "matchCase", label: "Case" }, { key: "matchWord", label: "Word" }, { key: "matchRegex", label: "Regex" }]
						.map((filter, i) => {
							const clickHandler = () => {
								setSearchState({ ...searchStore.getValue(), [filter.key]: !this.state[filter.key] });
							};
							return <div key={i} className={Styles.filter} onClick={clickHandler}>
								{this.state[filter.key] ? <CheckboxFilled className={Styles.icon} /> : <CheckboxOutline className={Styles.icon} />}
								{filter.label}
							</div>;
						})
				}
			</div>
			<a className={Styles.searchButton} href={getSearchPath(this.state)}>
				<SearchIcon className={Styles.icon} />
				Search code
				</a>
		</div>;
	}
}
