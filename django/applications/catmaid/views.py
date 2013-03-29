from django.conf import settings
from django.views.generic import TemplateView

class HomepageView(TemplateView):
    """ This view returns the index page of CATMAID and passes some
    extra context to its template.
    """
    template_name = "index.html"

    def get_context_data(self, **kwargs):
        context = super(self.__class__, self).get_context_data(**kwargs)
        context['CATMAID_URL'] = settings.CATMAID_URL
        profile_context = self.request.user.userprofile.as_dict()
        return dict(context.items() + profile_context.items())

class SegmentDecisionView(TemplateView):
    """ This view returns a page to decide on the correctness of a segment.
    """
    template_name = "catmaid/segmentdecision.html"

    def get_context_data(self, **kwargs):
        context = super(self.__class__, self).get_context_data(**kwargs)
        # TODO: segmentid
        context['origin_section'] = 0
        context['origin_sliceid'] = 123
        context['target_section'] = 0
        return context

