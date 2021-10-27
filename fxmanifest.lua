fx_version 'cerulean'
game 'gta5'

author 'Axis'
description 'QB-Core'
version '6.0.0'
description 'echo-inventory'

shared_scripts {
	'@qb-core/import.lua',
	'@qb-weapons/config.lua',
	'config.lua',
}

client_scripts {
	"config.lua",
	"client/*",
	"@qb-core/import.lua",
}

server_scripts {
	"server/main.lua",
	"@qb-core/import.lua",
}

ui_page {
	'html/ui.html'
}

files {
	'html/ui.html',
	'html/css/main.css',
	'html/js/app.js',
	'html/images/*.png',
	'html/images/*.jpg',
	'html/ammo_images/*.png',
	'html/attachment_images/*.png',
	'html/*.ttf',
	'html/cloth/*.png',
	'html/cloth/*.svg',
	'html/sound.mp3'
}

provide 'qb-inventory'