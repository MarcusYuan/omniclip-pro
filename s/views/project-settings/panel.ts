import {html} from "@benev/slate"
import {standard_panel_styles as styles, panel} from "@benev/construct"

import {omnislate} from "../../context/context.js"
import {shadow_view} from "../../context/context.js"
import gearSvg from "../../icons/gravity-ui/gear.svg.js"

export const ProjectSettingsPanel = () => panel({
	label: "Settings",
	icon: gearSvg,
	view: shadow_view(use => ({}: any) => {
		use.styles(styles)
		use.name("project-settings")
		const {ProjectSettings} = (omnislate as any).views
		return html`
			${ProjectSettings()([])}
		`
	}),
})
