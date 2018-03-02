let LastCallWebpackPlugin = require('last-call-webpack-plugin');

function FixUrlPathWebpackPlugin(options) {
    this.options = options || {};

    if (this.options.assetNameRegExp === undefined) {
        this.options.assetNameRegExp = /\.css$/g;
    }
    if (this.options.cssProcessorOptions === undefined) {
        this.options.cssProcessorOptions = {
            map: { inline: false },
        };
    }
    if (this.options.canPrint === undefined) {
        this.options.canPrint = true;
    }

    let self = this;
    this.lastCallInstance = new LastCallWebpackPlugin({
        assetProcessors: [
            {
                phase: LastCallWebpackPlugin.PHASE.OPTIMIZE_CHUNK_ASSETS,
                regExp: this.options.assetNameRegExp,
                processor: function (assetName, asset, assets) {
                    return self.do(assetName, asset, assets);
                },
            }
        ],
        canPrint: this.options.canPrint
    });
};

FixUrlPathWebpackPlugin.prototype.do = function(assetName, asset, assets)
{
    let processOptions = Object.assign(
        { from: assetName, to: assetName },
        this.options.cssProcessorOptions || {}
    );
    if (processOptions.map && !processOptions.map.prev) {
        try {
            const mapJson = assets.getAsset(assetName + '.map');
            if (mapJson) {
                const map = JSON.parse(mapJson);
                if (
                    map &&
                    (
                        (map.sources && map.sources.length > 0) ||
                        (map.mappings && map.mappings.length > 0)
                    )
                ) {
                    processOptions.map = Object.assign({ prev: mapJson }, processOptions.map);
                }
            }
        } catch (err) {
            console.warn('FixUrlPathWebpackPlugin.do() Error getting previous source map', err);
        }
    }

    let promise = new Promise((resolve, reject) => {
        const css = asset.source().replace(/url\(([\w\.\\]*).(eot|eot\?#iefix|woff|woff2|ttf|svg#icons)\)/g, function (match, p1, p2, offset, string) {
            return 'url(' + p1.replace(/\\/g, '/') + '.' + p2 + ')';
        });

        setTimeout(function() {
            resolve({
                css: css,
                map: processOptions.map,
            });
        }, 0);
    });

    return promise
        .then(r => {
            if (processOptions.map && r.map && r.map.toString) {
                assets.setAsset(assetName + '.map', r.map.toString());
            }
            return r.css;
        })
        ;
};

FixUrlPathWebpackPlugin.prototype.apply = function(compiler) {
    return this.lastCallInstance.apply(compiler);
};

module.exports = FixUrlPathWebpackPlugin;
