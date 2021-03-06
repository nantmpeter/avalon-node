/**
 * @fileoverview
 * @author czy88840616 <czy88840616@gmail.com>
 *
 */

var toolsList = {
    "uri":{
        class:"URL类型(直接输入url即可)",
        props:{
            uri:"http://assets.daily.taobao.net"
        }
    },
    tmsTool: {
        class:"com.taobao.vcenter.webx.TmsTool",
        props:{
            env:["dev","online"]
        }
    },
    cmsTool:{
        class:"com.taobao.vcenter.webx.CmsTool"
    },
    stringUtil:{
        class:"com.alibaba.common.lang.StringUtil"
    },
    tbStringUtil:{
        class:"com.taobao.util.TBStringUtil"
    },
    securityUtil:{
        class:"com.taobao.security.util.SecurityUtil"
    },
    systemUtil:{
        class:"com.alibaba.common.lang.SystemUtil"
    },
    randomUtil:{
        class:"com.taobao.util.RandomUtil"
    },
    calendarUtil:{
        class:"com.taobao.util.CalendarUtil"
    },
    dateUtil:{
        class:"com.taobao.util.DateUtils"
    },
    collectionUtil:{
        class:"com.taobao.util.CollectionUtil"
    },
    mapUtil:{
        class:"com.taobao.util.MapUtil"
    },
    stringEscapeUtil:{
        class:"com.alibaba.common.lang.StringEscapeUtil"
    },
    csrfToken:{
        class:"com.taobao.vcenter.webx.CsrfTokenTool"
    },
    pageCache:{
        class:"com.taobao.vcenter.webx.pageCacheTool"
    },
    vmcommonControl: {
        class:"com.taobao.vcenter.webx.VmcommonControl"
    },
    unicornTool: {
        class:"com.taobao.vcenter.webx.b2b.UnicornPullTool"
    },
    dateFormatUtil: {
        class:"org.apache.commons.lang.time.DateFormatUtils"
    },
    emsUtil: {
        class:"com.taobao.vcenter.webx.MiniCms"
    }
};
window.tools = window.tools || {};

var TPLReader =  function(data){
    return ['<div class="btn-group" data-toolkey="',
        data.key,
        '"><a class="btn btn-small btn-inverse J_Tooltip" rel="tooltip"',
        'href="#" data-placement="top" data-original-title="',
        data.className + ' ' + data.propString,
        '"><i class="icon-wrench icon-white"></i> ',
        data.key,
        '</a><a class="btn btn-small btn-inverse dropdown-toggle" data-toggle="dropdown" href="#">',
        '<span class="caret"></span></a> <ul class="dropdown-menu"><li>',
        '<a href="#" class="J_DeleteTool"><i class="icon-trash"></i> Delete</a></li></ul></div>'].join('');
};

var propTPLRender = function(data){

    if($.isArray(data.propValue)) {
        var selecttpl = [];
        selecttpl.push('<select class="J_PropCls" prop-key="' + data.propKey + '">');
        $.each(data.propValue, function(k, v){
            selecttpl.push('<option value="'+v+'">' + v + '</option>');
        });
        selecttpl.push('</select>');

        return ['<div class="control-group">',
            '<label class="control-label" style="width: 60px;">',
            data.propKey,
            '</label>',
            '<div class="controls" style="margin-left: 80px;">',
            selecttpl.join(''),
            '</div></div>'].join('');
    } else {
        return ['<div class="control-group">',
            '<label class="control-label" style="width: 60px;">',
            data.propKey,
            '</label>',
            '<div class="controls" style="margin-left: 80px;">',
            '<input class="span4 J_PropCls" type="text" prop-key="',
            data.propKey,
            '" placeholder="',
            data.propValue,
            '" value="',
            data.propValue,
            '"></div></div>'].join('');
    }
};

$(function () {
    //init load tools
    $.post('/app/loadtools', {
        app:$('#J_CurrentApp').val()
    }, function(data){
        if(data.success) {
            window.tools = data.tools || {};

            $.each(window.tools, function(idx, tool){
                //添加属性
                var propString = [];
                if(tool.props) {
                    $.each(tool.props, function(key, prop){
                        propString.push(key+'='+prop);
                    });
                }
                propString.join(',');

                $(TPLReader({
                    key:idx,
                    className:tool.class,
                    propString:propString
                })).appendTo($('#J_ToolContainer')).find('.J_DeleteTool').click(function(e){
                    e.preventDefault();
                    var el = $(this);
                    var toolKey = el.parents('.btn-group').attr('data-toolkey');
                    //删除
                    $.post('/app/removetool', {
                        app:$('#J_CurrentApp').val(),
                        toolkey:toolKey
                    }, function(data){
                        if(data.success) {
                            //delete data
                            delete window.tools[toolKey];
                            //remove dom
                            $(el).parents('.btn-group').remove();
                        } else {
                            alert(data.msg);
                        }
                    });
                }).end().find('.J_Tooltip').tooltip();
            });

            $('#J_ToolContainer').fadeIn(500);
        }
    });

    //event bind
    $('#J_AddTools').click(function(){
        $('#J_ToolModel').modal({
            backdrop:'static',
            show: true
        });
    });

    var tpl = [];
    $.each(toolsList, function(key, value){
        tpl.push("<option value='"+key+"'>"+value.class+"</option>");
    });

    //切换tool select
    $("#J_ToolsList").append(tpl.join('')).change(function(e){
        $('#J_ToolsError').hide();
        $('#J_ToolsProps').html('');
        var key = $(this).val();
        if(key === 'uri') {
            $('#J_ToolsKey').val('uiModule');
        } else {
            $('#J_ToolsKey').val(key);
        }

        if(toolsList[key].props) {
            $.each(toolsList[key].props, function(k, v){
                $(propTPLRender({
                    propKey: k,
                    propValue: v
                })).appendTo($('#J_ToolsProps'));
            });
        }
    });

    //添加一个tool
    $('#J_ToolsUse').click(function(e){
        $('#J_ToolsError').hide();
        if(!$('#J_ToolsList').val()) {
            $('#J_ToolsError').text('请先选择一个工具类！').fadeIn();
            return;
        }

        if(!$('#J_ToolsKey').val()) {
            $('#J_ToolsError').text('请填写变量名！').fadeIn();
            return;
        }

        if(window.tools[$('#J_ToolsKey').val()]) {
            $('#J_ToolsError').text('当前变量值已经存在，请添加一个不存在的值或者删除旧值！').fadeIn();
            return;
        }

        var key = $('#J_ToolsKey').val(),
            className = $('#J_ToolsList option:selected').text();

        //非uri类型的key不能和默认值相同
        if($('#J_ToolsKey').val() != 'tmsTool' && $('#J_ToolsList').val() != 'uri' && toolsList[key] && className == toolsList[key]['class']) {
            $('#J_ToolsError').text('填写的变量请不要和默认值相同！').fadeIn();
            return;
        }

        if($('#J_ToolsList').val() == 'uri') {
            className = 'uri';
        }

        //添加属性
        var propString = [];
        if(toolsList[$('#J_ToolsList').val()].props) {
            $('#J_ToolsProps .J_PropCls').each(function(idx, el){
                propString.push($(el).attr('prop-key')+'='+$(el).val());
            });
        }
        propString.join(',');

        $(TPLReader({
            key:key,
            className:className,
            propString:propString
        })).appendTo($('#J_ToolslistMock')).find('.J_DeleteTool').click(function(e){
            e.preventDefault();
            //delete data
            delete window.tools[$(this).parents('.btn-group').attr('data-toolkey')];
            //remove dom
            $(this).parents('.btn-group').remove();
        }).end().find('.J_Tooltip').tooltip();

        window.tools[$('#J_ToolsKey').val()] = {
            class:$('#J_ToolsList').val()=='uri'||$('#J_ToolsList').val()=='custom' ? $('#J_ToolsList').val() : $('#J_ToolsList option:selected').text()
        };

        if(toolsList[$('#J_ToolsList').val()].props) {
            var props = window.tools[$('#J_ToolsKey').val()].props = {};
            $('#J_ToolsProps .J_PropCls').each(function(idx, el){
                props[$(el).attr('prop-key')] = $(el).val();
            });
        }

        //reset
        $("#J_ToolsList").get(0).selectedIndex = 0;
        $('#J_ToolsKey').val('').attr('placeholder', 'key');
        $('#J_ToolsProps').html('');
    });

    $('#J_BtnConfirm').click(function(e){
        e.preventDefault();
        $.post('/app/settools', {
            app:$('#J_CurrentApp').val(),
            tools:window.tools
        }, function(data){
            if(data.success) {
                location.reload();
            } else {
                alert(data.msg);
            }
        });
    });

    $('#J_UpdateApp').click(function(e) {
        e.preventDefault();
        $(this).button('loading');

        $.post('/app/update', {
            app:$('#J_CurrentApp').val()
        }, function(data){
            if(data.success) {
                alert('更新成功，确定后刷新');
                location.reload();
            } else {
                alert(data.msg);
            }

            $('#J_UpdateApp').button('reset');
        });
    });

    $('.J_Tooltip').tooltip();

    $('.J_ScreenList li a').each(function(idx, el){
        var url = $(el).html(),
            us = url.split('/');

        if(us[us.length -1].indexOf('_') != -1) {
            $(el).attr('style', 'color:#E51400');
        }
    });

    $('.J_ScreenList li').mouseenter(function(ev){
        $(this).find('.J_ScreenPopup').show()
    }).mouseleave(function(){
        $(this).find('.J_ScreenPopup').hide()
    });

    $('#J_IsControlGlobal').on('click', function(ev){
        $.post('/app/updateControlGlobal', {
            isControlGlobal:!!$(ev.target).attr('checked'),
            appName: $('#J_CurrentApp').val()
        }, function(data){
            if(data.success) {
                location.reload();
            } else {
                alert(data.msg);
            }
        });
    });

    $('#J_AddExtraControl').on('click', function(ev){
        if(!$('#J_ExtraControlPath').val()) {
            return;
        }

        $('#J_ExtraControlList').siblings('.J_Progress').show();
        $.post('/app/addExtraControl', {
            value: $('#J_ExtraControlPath').val(),
            appName: $('#J_CurrentApp').val()
        }, function(data){
            $('#J_ExtraControlList').siblings('.J_Progress').fadeOut();
            if(data.success) {
                $('#J_ExtraControlList ul').append('<li data-path="' + data.value+ '">'+data.value+' <a href="#"><i class="icon-remove"></i></a></li>');
                $('#J_ExtraControlPath').val('');
            } else {
                alert(data.msg);
            }
        });
    });

    $('#J_ExtraControlList').on('click', '.icon-remove', function(ev){
        ev.preventDefault();
        $.post('/app/removeExtraControl', {
            value: $(ev.currentTarget).parents('li').attr('data-path'),
            appName: $('#J_CurrentApp').val()
        }, function(data){
            if(data.success) {
                $(ev.currentTarget).parents('li').remove();
            } else {
                alert(data.msg);
            }
        });
    });

    $('#J_SubModuleSelect').on('change', function(ev){
        $.post('/app/setDefaultModule', {
            defaultModule: $(this).val(),
            appName: $('#J_CurrentApp').val()
        }, function(data){
            if(data.success) {
                location.reload();
            } else {
                alert(data.msg);
            }
        });
    });

    $('.J_Encoding').on('change', function(ev){
        $.post('/app/setEncoding', {
            encoding: $(this).val(),
            appName: $('#J_CurrentApp').val()
        }, function(data){
            if(data.success) {
                location.reload();
            } else {
                alert(data.msg);
            }
        });
    });
});
