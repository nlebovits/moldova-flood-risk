# =========================================================
# Moldova Ag Flood-Risk Map — precompute pipeline orchestration
#
# All steps are idempotent. Re-running `make data` after a
# clean checkout re-fetches missing inputs but skips work
# already cached in `_work/`.
#
# Usage:
#   make data        # full pipeline → ships JSON into ../app/public/data/
#   make report      # full pipeline + render Quarto HTML
#   make info        # print resolved paths and constants
#   make clean       # delete _work/ and shipped JSON (keeps lockfile)
#   make clean-jrc   # delete cached JRC rasters only
# =========================================================

UV := uv run moldova-precompute
WORK := _work
APP_DATA := ../app/public/data
REPORT_DATA := ../report/data

# Per-RP flood-depth COGs shipped to the app's raster overlay.
RETURN_PERIODS := 10 20 50 100 200 500
FLOOD_COGS := $(foreach rp,$(RETURN_PERIODS),$(APP_DATA)/jrc/RP$(rp)_depth.tif)

.PHONY: all
all: report

.PHONY: data
data: $(APP_DATA)/field_attrs.json \
      $(APP_DATA)/fields.pmtiles \
      $(APP_DATA)/admin.geojson \
      $(APP_DATA)/summary.json \
      $(APP_DATA)/eal.json \
      $(FLOOD_COGS)
	@echo "✓ precompute complete"

.PHONY: fields-tiles
fields-tiles: $(APP_DATA)/fields.pmtiles

.PHONY: flood-cogs
flood-cogs: $(FLOOD_COGS)

.PHONY: report
report: $(REPORT_DATA)/variables.yml
	cd ../report && quarto render moldova-flood-risk.qmd
	@echo "✓ report generated at ../report/_site/moldova-flood-risk.html"

# ---------------------------------------------------------
# Phase outputs
# ---------------------------------------------------------

$(WORK)/fields.parquet:
	@mkdir -p $(WORK)
	$(UV) extract-fields

$(WORK)/jrc/.fetched:
	@mkdir -p $(WORK)/jrc
	$(UV) fetch-jrc
	@touch $@

# zonal-stats emits field_attrs.json AND _work/fields_attributed.parquet in a
# single pass (the parquet is a co-product, so it shares this recipe and keeps
# field IDs aligned with the JSON by construction).
$(APP_DATA)/field_attrs.json $(WORK)/fields_attributed.parquet &: $(WORK)/fields.parquet $(WORK)/jrc/.fetched
	@mkdir -p $(APP_DATA)
	$(UV) zonal-stats

$(APP_DATA)/fields.pmtiles: $(WORK)/fields_attributed.parquet
	@mkdir -p $(APP_DATA)
	$(UV) build-fields-tiles

# One COG per return period, built from the cached JRC tiles. `$*` is the RP.
$(APP_DATA)/jrc/RP%_depth.tif: $(WORK)/jrc/.fetched
	@mkdir -p $(APP_DATA)/jrc
	$(UV) build-flood-cogs --rp $*

$(APP_DATA)/admin.geojson: $(APP_DATA)/field_attrs.json
	@mkdir -p $(APP_DATA)
	$(UV) build-admin

$(APP_DATA)/summary.json: $(APP_DATA)/field_attrs.json
	@mkdir -p $(APP_DATA)
	$(UV) build-summary

$(APP_DATA)/eal.json: $(APP_DATA)/admin.geojson
	@mkdir -p $(APP_DATA)
	$(UV) build-eal

$(REPORT_DATA)/variables.yml: $(APP_DATA)/eal.json $(APP_DATA)/summary.json
	@mkdir -p $(REPORT_DATA)
	$(UV) export-report

# ---------------------------------------------------------
# Utilities
# ---------------------------------------------------------

.PHONY: info
info:
	$(UV) info

.PHONY: clean
clean:
	rm -rf $(WORK)
	rm -f $(APP_DATA)/field_attrs.json
	rm -f $(APP_DATA)/fields.pmtiles
	rm -f $(APP_DATA)/admin.geojson
	rm -f $(APP_DATA)/summary.json
	rm -f $(APP_DATA)/eal.json
	rm -rf $(APP_DATA)/jrc
	rm -rf $(REPORT_DATA)
	rm -rf ../report/_site

.PHONY: clean-jrc
clean-jrc:
	rm -rf $(WORK)/jrc

.PHONY: clean-report
clean-report:
	rm -rf $(REPORT_DATA)
	rm -rf ../report/_site
