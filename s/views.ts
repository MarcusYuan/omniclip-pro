import {omnislate} from "./context/context.js"
import {ProjectSettings} from "./views/project-settings/view.js"
import {loadingState, errorState} from "./views/state-handler/view.js"

export function register_views() {
	(omnislate as any).views = {
		loadingState,
		errorState,
		ProjectSettings
	}
}