
.PHONY: dev-server
dev-server:
	node server/fileserver.js

format:
	prettier --tab-width=4 -w client
