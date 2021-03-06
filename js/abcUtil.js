/**
 * abcUtil.js: A container for utility stuff.
 */
abcUtil = {

    genomic: [],
    features: [],

    randval: function () {
        return (0.95 * Math.random());
    },

    getQueryVariable: function (variable, queryString) {
        var vars = queryString.split('&');
        for (var i = 0; i < vars.length; i++) {
            var pair = vars[i].split('=');
            if (decodeURIComponent(pair[0]) == variable) {
                return decodeURIComponent(pair[1]);
            }
        }
    },

    getFindParm: function (variable, findUri) {
        var str = decodeURI(findUri);
        str = JSON.parse(str);

        if (str[variable]) {
            return str[variable];
        }
        else {
            return '';
        }
    },

    caMicroLink: function (case_id, cancer_type, x, y, findhost) {
        var arr = [];
        var url = "";
        /*
         // Until we get images on osprey, use default quip url.
         if (!findhost)
         {
         // Default
         url = config.quipUrl;
         }
         else {
         url = findhost;
         }*/
        url = config.quipUrl;

        if (x == undefined && y == undefined) {
            arr = [url, '?tissueId=', case_id, '&cancerType=', cancer_type];
        }
        else {
            arr = [url, '?tissueId=', case_id, '&cancerType=', cancer_type, '&x=', x, '&y=', y];
        }

        return arr.join("");

    },

    getRandomSubarrayPartialShuffle: function (arr, size) {
        // test:begin
        if (arr.length<=size) {
            console.log("Returning now.",arr.length);
            return arr;
        } else { // test:end
        
            var shuffled = arr.slice(0),
                i = arr.length,
                min = i - size,
                temp,
                index;
            
            //test
            console.log("Random shuffle.");
            
            while (i-- > min) {
                index = Math.floor((i + 1) * Math.random());
                temp = shuffled[index];
                shuffled[index] = shuffled[i];
                shuffled[i] = temp;
            }
            return shuffled.slice(min);
        } // test:end
    },

    featureArrays: function (selection) {
        var q = "";

        if (selection.findhost) {
            console.log("selection.findhost", selection.findhost);
            console.log("selection.findport", selection.findport);
            q = selection.findhost + ':' + selection.findport + '/?limit=100&collection=metadata&find={"cancer_type":"'
                + selection.cancer_type + '","execution_id":"' + selection.execution_id + '"}&db=u24_meta';
        }
        else {
            console.log("No selection.findhost, using default from config file.");
            q = config.findAPI + ':' + config.port + '/?limit=100&collection=metadata&find={"cancer_type":"'
                + selection.cancer_type + '","execution_id":"' + selection.execution_id + '"}&db=u24_meta';
        }

        $.ajax({
            url: q,
            async: false,
            dataType: 'json',
            success: function (arr) {

                arr.forEach(function (item) {
                    abcUtil.genomic = item.genomic;
                    abcUtil.features = item.imaging;

                });
            }
        });

    },

    selectBox: function (trace, selection, disableArray) {

        if (selection.findhost == undefined || selection.findhost == "") {
            console.log("Default FindAPI");
            selection.findhost = config.findAPI;
            selection.findport = config.port;
        }
        else {
            console.log("ok");
        }

        console.log("selection", selection);

        if (!disableArray) {
            // Disable nothing
            disableArray = [""];
        }
        if (jQuery.isEmptyObject(trace)) {

            trace = {
                url: selection.findhost + ':' + selection.findport + '/?limit=120&collection=metadata&find={}&db=u24_meta',
                id: 'selectTumor',
                onchange: 'tumorChanged(this)',
                font_color: 'navy',
                bg_color: 'silver',
                font_size: 'large',
                text: 'Select a dataset'
            };
        }

        // Dropdown menu
        var selectTumorHTML = '<span style="color:' + trace.font_color + '"><strong><font size="+1">';
        selectTumorHTML += trace.text
            + ':</font></strong>&nbsp;<select onchange="' + trace.onchange + '" '
            + ' style="font-color:' + trace.font_color
            + ';background-color:' + trace.bg_color
            + ';font-size:' + trace.font_size + '" id="' + trace.id + '">';

        console.log("trace.url", trace.url);

        $.ajax({
            url: trace.url,
            async: false,
            dataType: 'json',
            success: function (arr) {
                if (!selection.cancer_type) {
                    selection.cancer_type = 'luad';
                }

                arr.forEach(function (item) {
                    var tm = item.cancer_type;
                    var value = tm + ',' + item.db + ',' + item.execution_id;
                    var attr = '';
                    var exec = item.execution_id;

                    if (disableArray.indexOf(tm) > -1) {
                        attr = 'disabled';
                    }

                    if (tm == selection.cancer_type) {

                        if (selection.execution_id == null) {
                            selection.execution_id = item.execution_id;
                        }

                        if (selection.execution_id == item.execution_id) {
                            selection.db = item.db;
                            selection.execution_id = item.execution_id;
                            selection.cancer_type = item.cancer_type;
                            attr = 'selected';
                        }
                    }

                    selectTumorHTML += '<option value="' + value + '" ' + attr + '>'
                        + tm.toUpperCase() + ' - ' + item.name + ' - ' + exec + '</option>';

                });
            }
        });

        selectTumorHTML += "</select>";
        selectTumorHTML += "</span>";
        return selectTumorHTML;
    },

    listDxSlides: function (pp, data) {
        // check DxImages available
        if (!data) {

            var url = "";

            if (selection.findhost) {
                console.log("selection.findhost", selection.findhost);
                console.log("selection.findport", selection.findport);

                url = selection.findhost + ':' + selection.findport + '/?limit=1000&collection=metadata&find={"provenance.analysis_execution_id":"' + selection.execution_id + '"}&project={"_id":0,"image.subject_id":1,"image.case_id":1}&db=' + selection.db;
            }
            else {
                console.log("No selection.findhost, using default from config file.");
                url = config.findAPI + ':' + config.port + '/?limit=1000&collection=metadata&find={"provenance.analysis_execution_id":"' + selection.execution_id + '"}&project={"_id":0,"image.subject_id":1,"image.case_id":1}&db=' + selection.db;
            }

            $.ajax({
                url: url,
                async: false,
                dataType: 'json',
                success: function (arr) {

                    var a = [];
                    arr.forEach(function (item) {
                        var b = {};
                        b.patientid = item.image.subject_id;
                        b.caseid = item.image.case_id;
                        a.push(b);

                    });

                    var y = {}; // index of diagnostic images per patient
                    a.map(function (xi) {
                        if (!y[xi.patientid]) {
                            y[xi.patientid] = [xi.caseid]
                        } else {
                            y[xi.patientid].push(xi.caseid)
                        }

                    });

                    // SUBJECT ID: CASE IDs
                    data = y;
                    abcUtil.listDxSlides(pp, data)
                }
            });

        } else {
            var pp0 = pp.filter(function (pi) {
                return data[pi];
            });
            pp = [];
            pp0.map(function (pi) {
                pp = pp.concat(data[pi])
            });


            diagnosticImagesHeader.textContent = ' Diagnostic Images (' + pp.length + '):';

            pp.map(function (p) {
                if (!document.getElementById("link_" + p)) {
                    var pt = '';
                    if (typeof p == 'string') {
                        pt = p.match(/TCGA-\w+-\w+/)[0];
                    }
                    else {
                        pt = p[0].match(/TCGA-\w+-\w+/);
                    }

                    var tp = document.getElementById('dxSlide_' + pt); // target patient element
                    var dx = document.createElement('p');
                    dx.id = "link_" + p;
                    dx.innerHTML = '<a href="' + abcUtil.caMicroLink(p, selection.cancer_type) + '" target=_blank>' + p + '</a>';
                    tp.appendChild(dx)
                }

            })

        }

    },

    /**
     * TABULAR LIST OF PATIENTS AND DIAGNOSTIC IMAGES.
     */
    listSlides: function (patient, selection, data, R, S, P) {
        var parm = '';
        var ss = []; // list of slides
        var pp = []; // list of patients
        if (R != undefined && S != undefined && P != undefined) {
            if (R.gender.FEMALE.c + R.gender.MALE.c > R.section_location.BOTTOM.c + R.section_location.TOP.c) {
                parm = 'section_location'
            } else {
                parm = 'gender'
            }

            Object.getOwnPropertyNames(S[parm]).forEach(function (s) {
                if (S[parm][s].c > 0) {
                    ss.push(s)
                }
            });
            Object.getOwnPropertyNames(P[parm]).forEach(function (p) {
                if (P[parm][p].c > 0) {
                    pp.push(p)
                }
            });

        }

        if (pp.length == 0) {
            // object to array
            pp = $.map(patient, function (value, index) {
                return [value];
            });
        }

        tcgaPatientsHeader.textContent = ' TCGA patients (' + pp.length + '):';
        diagnosticImagesHeader.textContent = ' Diagnostic Images (...):';

        // DATA REFERENCE
        var tw = 'https://tcga-data.nci.nih.gov/tcgafiles/ftp_auth/distro_ftpusers/anonymous/tumor/';
        var d = document.getElementById('info2');
        var t = (selection.cancer_type).toUpperCase();

        if (typeof openHealth != 'undefined') {
            var f1 = openHealth.clinicalFile;
            var f2 = openHealth.biosFile;
            f1 = f1.substring(f1.indexOf(".") + 1);
            f2 = f2.substring(f2.indexOf(".") + 1);

            d.innerHTML = '<strong>Charts display clinical information from TCGA:</strong><br>'
                + '<a href="' + tw + openHealth.clinicalFile + '" target="_blank">' + f1 + '</a><br>'
                + '<a href="' + tw + openHealth.biosFile + '" target="_blank">' + f2 + '</a><br><br>'
                + '<strong><a href="#anchor">Diagnostic Images</a></strong> '
                + 'for <strong>' + pp.length + ' ' + t + ' patients</strong>';
        }
        else {
            d.innerHTML = '<strong><a href="#anchor">Diagnostic Images</a></strong> '
                + 'for <strong>' + pp.length + ' ' + t + ' patients</strong>';
        }

        // FIGURE4
        var btnFig4 = document.getElementById('btnFig4');
        var ppp = '';
        var fig4 = '';
        pp.forEach(function (p) {
            ppp += '"' + p + '",';

        });
        ppp = ppp.slice(0, -1);

        if (selection.findhost) {
            console.log("selection.findhost", selection.findhost);
            console.log("selection.findport", selection.findport);

            fig4 = config.domain + '/featurescape/fig4.html#' + selection.findhost + ':' + selection.findport
                + '?collection=patients&limit=' + pp.length + '&find={"analysis_id":"'
                + selection.execution_id + '","bcr_patient_barcode":{"$in":[' + ppp + ']}}&db='
                + selection.db + '&c=' + selection.cancer_type;
        }
        else {
            console.log("No selection.findhost, using default from config file.");
            fig4 = config.domain + '/featurescape/fig4.html#' + config.findAPI + ':' + config.port
                + '?collection=patients&limit=' + pp.length + '&find={"analysis_id":"'
                + selection.execution_id + '","bcr_patient_barcode":{"$in":[' + ppp + ']}}&db='
                + selection.db + '&c=' + selection.cancer_type;
        }

        if (btnFig4) {
            btnFig4.value = "FeatureExplorer for " + pp.length + " patients";
            btnFig4.color = "indigo";

            btnFig4.onclick = function () {
                window.open(fig4)
            };
        }

        resultsPatient = function (x) {

            var v = abcUtil.randval();
            var textContent = v.toString().slice(0, 5);
            var exec = '"provenance.analysis.execution_id":"' + selection.execution_id + '"';
            var find = '{"randval":{"$gte":' + textContent + '},' + exec
                + ',"provenance.analysis.source":"computer"'
                + ',"provenance.image.subject_id":"'
                + (typeof patient[x.textContent] == 'undefined' ? x.textContent : patient[x.textContent]["bcr_patient_barcode"])
                + '"}&db=' + selection.db + '&c=' + selection.cancer_type;

            // FEATURESCAPE
            console.log("A");
            var fscape = "";
            if (selection.findhost) {
                console.log("selection.findhost", selection.findhost);
                console.log("selection.findport", selection.findport);
                fscape = config.domain + '/featurescape/?' + selection.findhost + ':' + selection.findport + '/?limit=1000&find=' + find;
            }
            else {
                console.log("No selection.findhost, using default from config file.");
                fscape = config.domain + '/featurescape/?' + config.findAPI + ':' + config.port + '/?limit=1000&find=' + find;
            }
            moreInfo.innerHTML = ' <input id="fscapeButton" style="color:blue" type="button" value="FeatureScape (if available) for ' + patient[x.textContent]["bcr_patient_barcode"] + '">'
                + '&nbsp;&nbsp; <input id="fig4Button" style="color:indigo" type="button" value="FeatureExplorer (if available) for ' + pp.length + ' patients"><pre>' + JSON.stringify(patient[x.textContent], null, 3) + '</pre>';

            fscapeButton.onclick = function () {
                window.open(fscape)
            };

            fig4Button.onclick = function () {
                window.open(fig4)
            };

        };


        patientSlideTableBody.innerHTML = ""; // clear tbody
        pp.sort().forEach(function (p, i) {

            var tr = document.createElement('tr');
            if (typeof p == 'object') {
                p = p.bcr_patient_barcode;
            }
            tr.id = 'tr_' + p;
            var num = i + 1;

            tr.innerHTML = '<td id="tdPatient_' + p + '" style="vertical-align:top">' + (num <= 9 ? '0' : '') + num + ') '
                + '<button onclick="resultsPatient(this)">' + p + '</button>&nbsp;'
                + '(<a href="http://www.cbioportal.org/case.do?case_id=' + p + '&cancer_study_id=' + selection.cancer_type + '_tcga" target=_blank>cBio</a>)'
                + '</td>'
                + '<td id="dxSlide_' + p + '" style="vertical-align:top;font-size:12"></td>';
            patientSlideTableBody.appendChild(tr);

        });

        abcUtil.listDxSlides(pp, data)
    },

    setupDC1: function (karnofsky_performance_score) {

        var ks = '';
        var ks1 = '';
        if (karnofsky_performance_score != null) {

            ks = '<div style="color:blue">Karnofsky Score:</div>'
                + '<div id="karnofsky_performance_score" style="border:solid;border-color:blue;box-shadow:10px 10px 5px #888888"></div>';

            ks1 = 'color indicates Karnofsky performance score (see framed bar chart);';
        }
        else {
            ks = '<div style="color:blue">Karnofsky Score:</div>'
                + '<div id="karnofsky_performance_score" class="well" style="border:solid;border-color:blue;box-shadow:10px 10px 5px #888888">Scores not available</div>';

        }

        var html = '';
        html += '<table cellpadding="10px">';
        html += '<tr>';
        html += '<td style="vertical-align:top"><table>';
        html += '<tr>';
        html += '<td style="vertical-align:top"><div>% Necrotic Cells:</div>';
        html += '<div id="percent_necrosis"></div>';
        html += '<div>% Tumor Nuclei:</div>';
        html += '<div id="percent_tumor_nuclei"></div>';
        html += '<div>Location:</div>';
        html += '<div id="section_location"></div></td>';
        html += '<td style="vertical-align:top"><div>% Tumor Cells:</div>';
        html += '<div id="percent_tumor_cells"></div>';
        html += '<div>% Lymphocyte Infiltration:</div>';
        html += '<div id="percent_lymphocyte_infiltration"></div>';
        html += '<div>Race:</div>';
        html += '<div id="race"></div>';
        html += '<div>Gender:</div>';
        html += '<div id="gender"></div></td>';
        html += '<td style="vertical-align:top"><div>% Stromal Cells:</div>';
        html += '<div id="percent_stromal_cells"></div>';
        html += ks;
        html += '<div>% Monocyte Infiltration:</div>';
        html += '<div id="percent_monocyte_infiltration"></div>';
        html += '<div>% Neutrophil Infiltration:</div>';
        html += '<div id="percent_neutrophil_infiltration"></div></td>';
        html += '</tr>';
        html += '</table></td>';
        html += '<td style="vertical-align:top"><h3>' + (selection.cancer_type).toUpperCase() + ' Tumor progression</h3>';
        html += '<div id="tumorProgression"></div>';
        html += '<b>Legend</b>: ' + ks1 + ' diameter indicates number of images</td>';
        html += '</tr>';
        html += '</table>';

        return html;
    },

    setupDC2: function () {

        var html = '';
        html += '<a name="anchor"></a>';

        html += '<table>';
        html += '<tr>';
        html += '<td style="vertical-align:top">';
        html += '<table border="1" id="patientSlideTable">';
        html += '<thead>';
        html += '<tr>';
        html += '<td id="tcgaPatientsHeader" style="color:maroon;font-weight:bold">TCGA Patients:</td>';
        html += '<td id="diagnosticImagesHeader" style="color:maroon;font-weight:bold">Diagnostic Images:</td>';
        html += '</tr>';
        html += '</thead>';
        html += '<tbody id="patientSlideTableBody"></tbody>';
        html += '</table>';
        html += '</td>';
        html += '<td id="moreInfo" style="vertical-align:top"></td>';
        html += '</tr>';
        html += '</table>';

        return html;
    },

    getPatientArrayFromUrl: function (url) {
        var patients = [];
        if (url.indexOf('bcr_patient_barcode') > -1) {
            var str = url.substring(url.indexOf('bcr_patient_barcode'));
            str = decodeURI(str);
            if (str.indexOf('"') > -1) {
                str = str.replace(/"/g, '');
            }

            if (str.indexOf('[') > -1) {
                str = str.substring(str.indexOf('[') + 1, str.indexOf(']'));
            }

            if (str.indexOf(',') > -1) {
                patients = str.split(',');
            }
            else {
                patients[0] = str;
            }

        }

        return patients;
    },

    /**
     * TABULAR LIST OF PATIENTS or DIAGNOSTIC IMAGES.
     */
    doPatients: function (data, idx, url, win) {

        var ptslides = document.getElementById('ptslides');

        var h = '';
        if (url) {
            var patients = abcUtil.getPatientArrayFromUrl(url);
            if (patients.length > data.length) {
                h = 'Found ' + data.length + ' out of the ' + patients.length + ' patients that were requested';
            }
            else {
                h = data.length + ' Diagnostic Images:';
            }

        }
        else {
            h = data.length + ' Diagnostic Images:';
        }

        var t = '<a name="anchor"></a><table id="patientSlideTable"><tr><td id="tcgaPatientsHeader" style="color:maroon;font-weight:bold">'
            + h + '</td></tr><tr><td><em>Click button to view FeatureScape</em></td></tr>';

        data.forEach(function (dd) {
            var x = dd[idx];

            if (typeof x == 'undefined') {
                x = dd.provenance.image.subject_id;
            }
            t += '<tr><td><button onclick="abcUtil.goFeature(this)">' + x + '</button></td></tr>';
        });
        t += '</table>';

        ptslides.innerHTML = t;

    },

    goFeature: function (x) {
        var v = abcUtil.randval();
        var textContent = v.toString().slice(0, 5);

        // FEATURESCAPE
        var db = selection.db;
        var xxx = x.innerHTML;
        var parm = 'subject_id';
        if (xxx.length > 12)
            parm = 'case_id';
        
        // "source":"human" is no bueno. Use "source":"computer"
        var find = '{"randval":{"$gte":' + textContent + '},"provenance.analysis.source":"computer","provenance.image.' + parm + '":"' + xxx + '"}&db=' + db + '&c=' + selection.cancer_type;

        console.log("B");
        var fscape = "";
        if (selection.findhost) {
            console.log("selection.findhost", selection.findhost);
            console.log("selection.findport", selection.findport);
            fscape = config.domain + '/featurescape/?' + selection.findhost + ':' + selection.findport + '/?limit=1000&find=' + find;
        }
        else {
            console.log("No selection.findhost, using default from config file.");
            fscape = config.domain + '/featurescape/?' + config.findAPI + ':' + config.port + '/?limit=1000&find=' + find;
        }
        window.open(fscape);
    },

    clrMsg: function (h) {
        var a = document.getElementById('msg');
        a.innerHTML = h;

        a = document.getElementById('info1');
        a.innerHTML = '';

        a = document.getElementById('info2');
        a.innerHTML = '';

        a = document.getElementById('section');
        a.innerHTML = '';

        a = document.getElementById('ptslides');
        a.innerHTML = '';
    },

    noDataJoy: function (url) {
        var h = '<span style="color:red;font-weight:bold;">Data not available';
        var patients = abcUtil.getPatientArrayFromUrl(url);

        if (patients.length == 0) {
            h += '</span><br>';
            abcUtil.clrMsg(h);
        }
        else {
            h += ' for patients:</span><br>';
            patients.forEach(function (bb) {
                h += bb + '<br>';
            });
            abcUtil.clrMsg(h);
        }

    }

};
